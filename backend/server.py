import collections
import config
import flask
import json
import gc
import array
import random
import os
import mimetypes
import MySQLdb as mysql
import MySQLdb.cursors
import cPickle as pickle
import platform

APP = flask.Flask(__name__,
  static_folder='../app' if os.environ.get('ENV') == 'DEV' else '../app/dist',
  static_url_path='')

ROOT = os.path.dirname(os.path.realpath(__file__))
INDEX_CACHE_FILENAME = 'commit_index.pickle'


def connect_to_db():
  return mysql.connect(
      host=config.DB_HOST,
      user=config.DB_USER,
      passwd=config.DB_PASSWORD,
      db=config.DB_NAME,
      cursorclass=MySQLdb.cursors.DictCursor)


def initialize():
  print 'Initializing...'
  with connect_to_db() as cursor:
    # Get all repositories.
    cursor.execute('SELECT * FROM repository')
    first_row = cursor.fetchone()
    repo_class = collections.namedtuple('Repository',
                                        ' '.join(first_row.keys()))
    repos = {}
    repos[first_row['name']] = repo_class(**first_row)
    for row in cursor.fetchall():
      repos[row['name']] = repo_class(**row)

    # Get a commit index.
    index_class = collections.namedtuple('Index', 'grades ids')
    cache_path = os.path.join(ROOT, INDEX_CACHE_FILENAME)
    if os.path.exists(cache_path):
      print '  ...from cache.'
      cache_file = open(cache_path, 'r')
      commit_index_raw = pickle.load(cache_file)
      commit_index = index_class(*commit_index_raw)
      cache_file.close()
    else:
      print '  ...from DB.'
      cursor.execute('SELECT grade, order_id '
                    'FROM commit WHERE grade >= 0 '
                    'ORDER BY grade ASC')
      grades = []
      ids = array.array('i')
      last_grade = -1
      for _ in xrange(0, cursor.rowcount / 1000):
        for commit in cursor.fetchmany(1000):
          grade = commit['grade']
          if last_grade != grade:
            for _ in xrange(last_grade, grade):
              grades.append(len(ids))
            last_grade = grade
          ids.append(commit['order_id'])
      commit_index = index_class(tuple(grades), tuple(ids))

      cache_file = open(cache_path, 'w')
      pickle.dump([tuple(grades), tuple(ids)], cache_file)
      cache_file.close()

  # Try to GC, since iterating over the table uses up a lot of RAM.
  gc.collect()

  print 'Initialization done.'
  return repos, commit_index


# Assume we have enough memory to keep all repositories and a commit index loaded.
REPOS, COMMIT_INDEX = initialize()
REPO_NAMES = REPOS.keys()


@APP.route("/")
@APP.route("/level/<level_id>")
def homepage(level_id=None):
  return open(os.path.join(ROOT, '../app/index.html'), 'r').read()


@APP.route("/level/<length>/<min_grade>/<max_grade>")
def level(length, min_grade, max_grade):
  length = min(int(length), 256)
  max_grade = int(max_grade)
  min_grade = int(min_grade)

  start = COMMIT_INDEX.grades[min_grade]
  end = COMMIT_INDEX.grades[max_grade]
  ids = [COMMIT_INDEX.ids[i] for i in random.sample(xrange(start, end), length)]

  sql = 'SELECT * FROM commit WHERE order_id IN (%s)' % ','.join(map(str, ids))
  with connect_to_db() as cursor:
    cursor.execute(sql)
    commits = cursor.fetchall()

  levels = []
  for commit in commits:
    repo_names = random.sample(REPO_NAMES, 4)
    if commit['repository'] not in repo_names:
      repo_names = repo_names[:3] + [commit['repository']]
    repos = [REPOS[i]._asdict() for i in repo_names]
    random.shuffle(repos)
    levels.append({'commit': commit, 'repos': repos})

  return flask.Response(json.dumps({'rounds': levels}), mimetype='text/json')

if platform.system() == 'Windows':
  # FontAwesome files cause a weird bug on Windows. Hack around it.
  @APP.route('/build/FortAwesome-Font-Awesome/fonts/<path:path>')
  @APP.route('/build//FortAwesome-Font-Awesome/fonts/<path:path>')
  def custom_static(path):
    path = path.replace('../', '')  # Make sure we don't try to reach outside.
    fs_path = os.path.join(
        ROOT, '../app/build/FortAwesome-Font-Awesome/fonts/', path)
    print fs_path
    if os.path.exists(fs_path):
      mime = mimetypes.guess_type(fs_path)[0]
      return flask.Response(open(fs_path, 'rb'), mimetype=mime)
    else:
      return 'Not Found', 404


if __name__ == "__main__":
  APP.run(debug=True if os.environ.get('ENV') == 'DEV' else False)
