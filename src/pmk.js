// external dependencies
var request = require('request');

// internal dependencies
var PMKError = require('./error.js');

// globals
var nonWord = /[^a-z0-9 ]/i;
var noOp = function() {};

/**
  Constructor for the API

  @param {String} token Postmark Server API Token
*/
function PMK(token) {
  if (!arguments.length) {
    throw 'You must initialize with a valid postmark api token';
  }

  this.token = token;
}

/**
  Sends an email

  message.text and message.html are optional, but at least one must be set

  @param {Object} message Fields used to send the email
  @param {String} [message.from] Email address of sender
  @param {String} [message.fromName] Name corresponding to from email
  @param {String|String[]} message.to Email recipient(s)
  @param {String|String[]} [message.cc] Carbon copy recipient(s)
  @param {String|String[]} [message.bcc] Blind carbon copy recipient(s)
  @param {String|String[]} [message.reply] Reply To email address
  @param {String} message.subject Subject
  @param {String} [message.text] Text body
  @param {String} [message.html] HTML body
  @param {Function} [callback] Callback function
*/
PMK.prototype.email = function(message, callback) {
  var body = {};
  var postmarkKey, key;
  var recipients = 0;

  callback = callback || noOp;

  // mandatory checks
  if (!message.to) {
    callback(new PMKError('\'to\' email address not set'));
    return;
  } else if (!message.subject) {
    callback(new PMKError('\'subject\' for email not set'));
    return;
  } else if (!message.text && !message.html) {
    callback(new PMKError('email content (\'text\', \'html\') not set'));
    return;
  }

  // who the email is from
  if (message.from && message.fromName) {
    body.From = nonWord.test(message.fromName) ? '"' + message.fromName + '"' : message.fromName;
    body.From += ' <' + message.from + '>';
  } else if (message.from) {
    body.From = message.from;
  }

  // who the email is to
  if (Array.isArray(message.to)) {
    if (!message.to.length) {
      callback(new PMKError('\'to\' email address not set'));
      return;
    }

    recipients += message.to.length;
    body.To = message.to.join(',');
  } else {
    recipients += 1;
    body.To = message.to;
  }

  // cc(s)
  if (Array.isArray(message.cc)) {
    if (message.cc.length) {
      recipients += message.cc.length;
      body.Cc = message.cc.join(',');
    }
  } else if (message.cc) {
    recipients += 1;
    body.Cc = message.cc;
  }

  // bcc(s)
  if (Array.isArray(message.bcc)) {
    if (message.bcc.length) {
      recipients += message.bcc.length;
      body.Bcc = message.bcc.join(',');
    }
  } else if (message.bcc) {
    recipients += 1;
    body.Bcc = message.bcc;
  }

  // recipient limit check
  if (recipients > 20) {
    callback(new PMKError('Postmark has a limit of 20 recipients, this request has ' + recipients));
    return;
  }

  // rest of the keys
  var pairs = {
    reply: 'ReplyTo',
    tag: 'Tag',
    html: 'HtmlBody',
    text: 'TextBody',
    headers: 'Headers', // to do: make this one better
    subject: 'Subject',
    to: 'To',
    attachments: 'Attachments' // to do: make this one better
  }
  for (key in pairs) {
    if (message[key]) {
      body[ pairs[key] ] = message[key];
    }
  }

  // finally, the request
  request({
    method: 'POST',
    uri: 'https://api.postmarkapp.com/email',
    headers: {
      charset: 'utf-8',
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': this.token
    },
    body: JSON.stringify(body)
  }, function(err, res, body) {
    if (err) {
      callback(err);
      return;
    }

    var result;

    try {
      result = JSON.parse(body);
    } catch(err) {
      callback(new PMKError('Failed to parse response'));
      return;
    }

    // to do: deal with errors in response
    callback(null, result);
  });
};

module.exports = PMK;
