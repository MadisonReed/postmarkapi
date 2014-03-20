// external dependencies
var request = require('request');

function PMK(config) {
  if (!config.token) {
    throw 'You must initialize with a valid postmark api token';
  }

  this.config = config;
}

PMK.prototype.send = function() {};
