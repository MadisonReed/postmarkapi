// external dependencies
var request = require('request');
var async = require('async');
var fs = require('fs');
var path = require('path');
var mime = require('mime');

// internal dependencies
var PMKError = require('./error.js');

// globals
var nonWord = /[^a-z0-9 ]/i;
var noOp = function() {};
var slice = Array.prototype.slice;

/**
  Constructor for the API

  @param {String} token Postmark Server API Token
*/
function PMK(token) {
  if (!arguments.length) {
    throw 'You must initialize with a valid postmark api token';
  }

  this.get = curry(makeRequest, token, 'GET');
  this.post = curry(makeRequest, token, 'POST');
  this.put = curry(makeRequest, token, 'PUT');
  this.delete = curry(makeRequest, token, 'DELETE');
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
  @param {String|String[]} [message.reply] Reply-To email address
  @param {String} [message.tag] Tag
  @param {Object} [message.headers] Custom headers to send in request (key value pairs)
  @param {String[]} Attachments (string paths to local files)
  @param {String} message.subject Subject
  @param {String} [message.text] Text body
  @param {String} [message.html] HTML body
  @param {Function} [callback] Callback function
*/
PMK.prototype.email = function(message, callback) {
  var self = this;
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

  if (message.headers) {
    body.Headers = [];

    for (key in message.headers) {
      body.Headers.push({
        Name: key,
        Value: message.headers[key]
      });
    }
  }

  if (message.attachments) {
    body.Attachments = [];

    async.each(message.attachments, function(filepath, cb) {
      if (typeof filepath !== 'string') {
        cb(new PMKError('Attachments must be file paths'));
        return;
      }

      fs.readFile(filepath, function(err, content) {
        if (err) {
          cb(err);
          return;
        }

        body.Attachments.push({
          Name: path.basename(filepath),
          Content: content.toString('base64'),
          ContentType: mime.lookup(filepath)
        });
        cb();
      });
    }, doRequest);
  } else {
    doRequest();
  }

  function doRequest(err) {
    if (err) {
      callback(err);
      return;
    }

    // rest of the keys
    var pairs = {
      reply: 'ReplyTo',
      tag: 'Tag',
      html: 'HtmlBody',
      text: 'TextBody',
      subject: 'Subject',
      to: 'To'
    }
    for (key in pairs) {
      if (message[key]) {
        body[ pairs[key] ] = message[key];
      }
    }

    // finally, the request
    self.post('email', body, callback);
  }
};

/**
  Returns a summary of inactive emails and bounces by type over the entire history of the server

  @param {Function} callback Callback function
*/
PMK.prototype.deliverystats = function(callback) {
  this.get('deliverystats', callback);
};

/**
  Retrieves bounces

  @param {Object} options Options for the request
  @param {String|Number} [options.count] Count for paging [Required if not passing messageID]
  @param {String|Number} [options.offset] Offset for paging [Required if not passing messageID]
  @param {String} [options.type] Bounce type
  @param {Boolean} [options.inactive] Filter by inactive / active status
  @param {String} [options.emailFilter] Filters out emails that don't match this substring
  @param {String} [options.messageID] Returns only messages matching the given message id
  @param {Function} callback Callback function
*/
PMK.prototype.bounces = function(options, callback) {
  this.get('bounces', options, callback);
};

/**
  Gets a single bounce

  @param {String} id The bounce id
  @param {Function} callback Callback function
*/
PMK.prototype.bounce = function(id, callback) {
  this.get('bounces/' + id, callback);
};

/**
  Returns a single bounce's dump

  @param {String} id The bounce id
  @param {Function} callback Callback function
*/
PMK.prototype.bounceDump = function(id, callback) {
  this.get('bounces/' + id + '/dump', callback);
};

/**
  Returns a list of tags used for the current server.

  @param {Function} callback Callback function
*/
PMK.prototype.bounceTags = function(callback) {
  this.get('bounces/tags', callback);
};

/**
  Activates a deactivated bounce

  @param {String} id The bounce id
  @param {Function} [callback] Callback function
*/
PMK.prototype.bounceActivate = function(id, callback) {
  callback = callback || noOp;

  this.put('bounces/' + id + '/active', callback);
};

/**
  Gets sent messages

  @param {Object} options The filtering options
  @param {String|Number} options.count Paging count
  @param {String|Number} options.offset Paging offset
  @param {String} [options.recipient] Who the message was sent to
  @param {String} [options.fromemail] Messages with a given 'from' email address
  @param {String} [options.tag] Messages with a given tag
  @param {String} [options.subject] Messages with a given subject
  @param {Function} callback Callback function
*/
PMK.prototype.outbound = function(options, callback) {
  this.get('messages/outbound', options, callback);
};

/**
  Get details for a single sent message

  @param {String} id The message id for the email
  @param {Function} callback Callback function
*/
PMK.prototype.outboundMessage = function(id, callback) {
  this.get('messages/outbound/' + id + '/details', callback);
};

/**
  Get sent email dump

  @param {String} id The message id for the email
  @param {Function} callback Callback function
*/
PMK.prototype.outboundMessageDump = function(id, callback) {
  this.get('messages/outbound/' + id + '/dump', callback);
};

/**
  Gets recieved messages

  @param {Object} options The filtering options
  @param {String|Number} options.count Paging count
  @param {String|Number} options.offset Paging offset
  @param {String} [options.recipient] Who the message was sent to
  @param {String} [options.fromemail] Messages with a given 'from' email address
  @param {String} [options.tag] Messages with a given tag
  @param {String} [options.subject] Messages with a given subject
  @param {String} [options.mailboxhash] Messages with a given mailboxhash
  @param {Function} callback Callback function
*/
PMK.prototype.inbound = function(options, callback) {
  this.get('messages/inbound', options, callback);
};

/**
  Get details for a single recieved message

  @param {String} id The message id for the email
  @param {Function} callback Callback function
*/
PMK.prototype.inboundMessage = function(id, callback) {
  this.get('messages/inbound/' + id + '/details', callback);
};

/**
  Fetches a list of Sender Signatures

  @param {Object} options The paging options
  @param {String|Number} options.count Paging count
  @param {String|Number} options.offset Paging offset
  @param {Function} callback Callback function
*/
PMK.prototype.senders = function(options, callback) {
  this.get('senders', options, callback);
};

/**
  Fetches a single Sender's details

  @param {String} id The Sender id
  @param {Function} callback Callback function
*/
PMK.prototype.sender = function(id, callback) {
  this.get('senders/' + id, callback);
};

/**
  Creates a new Sender Signature

  @param {Object} options The creation options
  @param {String} options.name The name of the sender
  @param {String} options.from The from email address
  @param {String} [options.reply] The reply-to email address
  @param {Function} [callback] Callback function
*/
PMK.prototype.createSender = function(options, callback) {
  callback = callback || noOp;

  var body = {
    Name: options.name,
    FromEmail: options.from
  };

  if (options.reply) {
    body.ReplyToEmail = options.reply;
  }

  this.post('senders', body, callback);
};

/**
  Updates a Sender Signature

  @param {String} id The sender id
  @param {Object} options The update options
  @param {String} options.name The name of the sender
  @param {String} [options.reply] The reply-to email address
  @param {Function} [callback] Callback function
*/
PMK.prototype.updateSender = function(id, options, callback) {
  callback = callback || noOp;

  var body = {
    Name: options.name
  };

  if (options.reply) {
    body.ReplyToEmail = options.reply;
  }

  this.put('senders/' + id, body, callback);
};

/**
  Resends confirmation email for a Sender Signature

  @param {String} id The sender id
  @param {Function} [callback] Callback function
*/
PMK.prototype.resendSender = function(id, callback) {
  callback = callback || noOp;

  this.post('senders/' + id + '/resend', callback);
};

/**
  Deletes a Sender Signature

  @param {String} id The sender id
  @param {Function} [callback] Callback function
*/
PMK.prototype.deleteSender = function(id, callback) {
  callback = callback || noOp;

  this.delete('sender/' + id, callback);
};

/**
  Verifies a SPF record

  @param {String} id The sender id
  @param {Function} [callback] Callback function
*/
PMK.prototype.verifySPF = function(id, callback) {
  callback = callback || noOp;

  this.post('senders/' + id + '/verifyspf', callback);
};

/**
  Requests a new DKIM

  @param {String} id The sender id
  @param {Function} [callback] Callback function
*/
PMK.prototype.requestDKIM = function(id, callback) {
  callback = callback || noOp;

  this.post('senders/' + id + '/requestnewdkim', callback);
};

/**
  Lists servers

  @param {Object} options The listing options
  @param {String|Number} options.count Paging count
  @param {String|Number} options.offset Paging offset
  @param {String} options.name Server name to search by (.e.g 'production')
  @param {Function} callback Callback function
*/
PMK.prototype.servers = function(options, callback) {
  this.get('servers', options, callback);
};

/**
  Gets a single server's details

  @param {String} id The server's id
  @param {Function} callback Callback function
*/
PMK.prototype.server = function(id, callback) {
  this.get('servers/' + id, callback);
};

/**
  Creates a new server

  @param {Object} options The creation options
  @param {String} options.name The name of the server
  @param {String} [options.color] The color indicator (e.g. 'red')
  @param {Boolean} [options.smtp] Indicate if this Server should have SMTP access turned on
  @param {Boolean} [options.raw] Indicate if Inbound web hook http post calls should include the original RAW email in the JSON body
  @param {String} [options.inboundHook] Url to send http posts to for Inbound message processing
  @param {String} [options.bounceHook] Url to send http posts to for any message bounces that occur on this Server
  @param {String} [options.inboundDomain] The MX domain used for MX Inbound processing
  @param {Function} [callback] Callback function
*/
PMK.prototype.createServer = function(options, callback) {
  callback = callback || noOp;

  var body = {
    Name: options.name
  };

  var pairs = {
    color: 'Color',
    smtp: 'SmtpApiActivated',
    raw: 'RawEmailEnabled',
    inboundHook: 'InboundHookUrl',
    bounceHook: 'BounceHookUrl',
    inboundDomain: 'InboundDomain'
  };

  for (var key in pairs) {
    if (options[key]) {
      body[ pars[key] ] = options[key];
    }
  }

  this.post('servers', body, callback);
};

/**
  Edits an existing server

  @param {String} id The server id
  @param {Object} options The listing options
  @param {String} options.name The name of the server
  @param {String} [options.color] The color indicator (e.g. 'red')
  @param {Boolean} [options.smtp] Indicate if this Server should have SMTP access turned on
  @param {Boolean} [options.raw] Indicate if Inbound web hook http post calls should include the original RAW email in the JSON body
  @param {String} [options.inboundHook] Url to send http posts to for Inbound message processing
  @param {String} [options.bounceHook] Url to send http posts to for any message bounces that occur on this Server
  @param {String} [options.inboundDomain] The MX domain used for MX Inbound processing
  @param {Function} [callback] Callback function
*/
PMK.prototype.updateServer = function(id, options, callback) {
  callback = callback || noOp;

  var body = {};

  var pairs = {
    name: 'Name',
    color: 'Color',
    smtp: 'SmtpApiActivated',
    raw: 'RawEmailEnabled',
    inboundHook: 'InboundHookUrl',
    bounceHook: 'BounceHookUrl',
    inboundDomain: 'InboundDomain'
  };

  for (var key in pairs) {
    if (options[key]) {
      body[ pars[key] ] = options[key];
    }
  }

  this.put('servers/' + id, body, callback);
};

/**
  Deletes an existing server

  @param {String} id The server id
  @param {Function} [callback] Callback function
*/
PMK.prototype.deleteServer = function(id, callback) {
  callback = callback || noOp;

  this.delete('servers/' + id, callback);
};

// method to make requests to the postmark api
// data is optional (becomes qs or body)
function makeRequest(token, method, pathname, data, callback) {
  if (arguments.length < 5) {
    callback = data;
    data = null;
  }

  var options = {
    method: method,
    uri: 'https://api.postmarkapp.com/' + pathname,
    headers: {
      charset: 'utf-8',
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': token
    }
  };

  if (data) {
    if (method.toUpperCase() === 'POST') {
      options.body = JSON.stringify(data);
    } else {
      options.qs = data;
    }
  }

  request(options, function(err, res, body) {
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

    if (result.ErrorCode) {
      if (result.Message) {
        err = result.Message;
        delete result.Message;
      } else {
        err = 'Failed';
      }
      callback(new PMKError(err, result));
      return;
    }

    callback(null, result);
  });
}

// curry utility
function curry(fn) {
  var args = slice.call(arguments, 1);

  return function() {
    // keeping the 'this' of this function, which will be useful for prototype methods
    return fn.apply(this, args.concat(slice.call(arguments)));
  };
}

module.exports = PMK;
