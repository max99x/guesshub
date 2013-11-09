var $ = require('jquery');
var Hogan = require('hogan.js');
var prism = require('prism');

var template = Hogan.compile(require('./template'));

// TODO: Add block name.

function CommitDisplay (model) {
  this.model = model;
  this.render();
}

// @param options { filename: true/false, author: true/false, metadata: true/false }
CommitDisplay.prototype.setVisibility = function (options) {
  if (options.filename != null) {
    this._setElementVisibility(this.$el.find('.filename'), options.filename);
  }

  if (options.author != null) {
    this._setElementVisibility(this.$el.find('.author'), options.author);
  }

  if (options.metadata != null) {
    this._setElementVisibility(this.$el.find('.metadata'), options.metadata);
  }
};

CommitDisplay.prototype._setElementVisibility = function ($el, show) {
  method = show ? 'removeClass' : 'addClass';
  $el[method]('hide');
};

CommitDisplay.prototype.render = function() {
  var oldNum = this.model.old_start_line();
  var newNum = this.model.new_start_line();
  var model = this.model.toJSON();
  var language = this._getCommitLanguage();
  var code = [];

  model.diff_lines = this.model.diff_lines().split('\n').map(function (line) {
    var ret = {};
    ret.op = line[0];
    ret.content = line.slice(1);
    ret.cls = 'context';
    switch (ret.op) {
      case '+':
        ret.new_num = ++newNum;
        ret.old_num = '&nbsp;';
        ret.cls = 'ins';
        break;
      case '-':
        ret.old_num = ++oldNum;
        ret.new_num = '&nbsp;';
        ret.cls = 'del';
        break;
      case '\\':
        content = '';
        break;
      case ' ':
        ret.new_num = ++newNum;
        ret.old_num = ++oldNum;
        break;
      default:
        ret.content = line;
    }
    if (ret.op !== '-' && ret.op !== '+') {
      ret.op = '&nbsp;';
      ret.cls = 'context';
    }
    code.push(ret.content);

    return ret;
  });

  var codeEl = $('<pre/>')
    .append('<code/>')
    .find('code')
    .addClass('language-' + language)
    .text(code.join('\n'))
    .get(0);

  prism.highlightElement(codeEl, false);
  $(codeEl).html().split('\n').forEach(function (highlightedLine, i) {
    model.diff_lines[i].content = highlightedLine;
  });

  this.$el = $(template.render(model));


};

CommitDisplay.prototype._getCommitLanguage = function() {
  var ext = this.model.filename().split('.').slice(-1)[0];
  ext = (ext || '').toLowerCase().trim();

  var lang = {
        ''                  : null,
        'c'                 : 'c',
        'h'                 : 'c',
        'coffeescript'      : 'coffeescript',
        'cs'                : 'csharp',
        'css'               : 'css',
        'd'                 : 'd',
        'go'                : 'go',
        'lhs'               : 'haskell',
        'html'              : 'html',
        'xml'               : 'markup',
        'java'              : 'java',
        'js'                : 'javascript',
        'json'              : 'javascript',
        'lua'               : 'lua',
        'php'               : 'php',
        'py'                : 'python',
        'r'                 : 'r',
        'rb'                : 'ruby',
        'scm'               : 'scheme',
        'sh'                : 'shell',
        'sql'               : 'sql',
        'scss'              : 'scss',
        'php'               : 'php',
        'groovy'            : 'groovy',
        'gvy'               : 'groovy',
        'gy'                : 'groovy',
        'gsh'               : 'gsh',
        'feature'           : 'gherkin'
  }[ext] || 'generic'; 
  console.log('CommitDisplay DEBUG: extension %s language %s', ext, lang);
  return lang; 
};


module.exports = CommitDisplay;
