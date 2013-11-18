var $ = require('jquery');
var Game = require('./game');
var User = require('models').User;
var Campaign = require('models').Campaign;

// TODO: Support storing user state.
var user = new User();

var game = new Game({
  user: user,
  campaign: Campaign.MAIN,
  $timer: $('#timer'),
  $repos: $('#repo-selector'),
  $scoreCard: $('#score-card'),
  $levelMeter: $('#level-meter'),
  $commitDisplay: $('#commit-display'),
  $powerList: $('#power-list'),
  $levelHub: $('#level-hub'),
});

game.start();

// DEBUG
window.game = game;

// TODO: Add support for switchable background music.
