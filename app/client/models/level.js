var $ = require('jquery');
var model = require('model');
var Repo = require('./repo');
var Commit = require('./commit');
var Round = require('./round');
var plugins = require('./plugins');

// Immutable level descriptions, declared as part of a Campaign.
var Level = plugins(model('Level'))
  .attr('id')
  .attr('name')
  .attr('num_rounds', { default: 10 })
  .attr('min_grade')
  .attr('max_grade')
  .attr('num_mistakes_allowed')
  .attr('timer')  // null: per-Round, based on grade.
  .attr('unlocks')
  ;
// TODO: Switch grade to a normalized range (0-1?).

Level.prototype.fetchRounds = function (callback) {
  var url = '/' + [
    'level',
    this.num_rounds(),
    this.min_grade(),
    this.max_grade()
  ].join('/');
  var defaultTimer = this.timer();
  // TODO: Retry with exponential backoff on errors.
  $.getJSON(url, function (commits_json) {
    callback(commits_json.rounds.map(function(c) {
      return new Round({
        commit: new Commit(c.commit),
        repos: c.repos.map(Repo),
        constant_timer: defaultTimer
      });
    }));
  });
};

module.exports = Level;
