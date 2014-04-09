# Postmark API

This is a full REST API wrapper for Postmark

To use the module, run `npm install postmarkapi`

## Using the module

First you must make a instance of the module, with your Postmark Server token.

```js
var PostmarkAPI = require('postmarkapi');
var pmk = new PostmarkAPI('[your server token]');
```

## Sending an email

You always need to define a `to` for an email, and  `subject`. You can send `text` or `html`, or both, but you need to define one or ther other.

If you don't define a `from`, it will use the address you created the Sender Signature with.

You can send multiple `cc`s or `bcc`s by passing an array.

You don't need to pass a callback.

```js
// simple example
pmk.email({
  to: 'someaddress@somewhere.com',
  subject: 'Test Email',
  text: 'Hello World'
});

// more specific
pmk.email({
  to: 'someaddress@somewhere.com',
  from: 'fromaddress@somewhere.com',
  fromName: 'John Doe',
  cc: ['carbon-copy@somewhere.com', 'carbon-copy-2@somewhere.com'],
  bcc: 'blind-carbon-copy@somewhere.com',
  reply: 'reply-to@somewhere.com',
  tag: 'MyTag',
  headers: {
    EmailedUsing: 'Node PostmarkAPI Module'
  },
  subject: 'Test Email',
  text: 'Hello World',
  html: '<strong>Hello World</strong>'
}, function(err, response) {
  // ...
});
```
You can also send an email with attachments

```js
var path = require('path');

pmk.email({
  to: 'someaddress@somewhere.com',
  from: 'fromaddress@somewhere.com',
  subject: 'Test Email',
  text: 'Hello World',
  html: '<strong>Hello World</strong>',
  attachments: [
    path.resolve(__dirname, 'cats.gif'),
    path.resolve(__dirname, 'notes.txt')
  ]
}, function(err, response) {
  // ...
});
```

## Bounces

### Getting a summary of bounces for the server

```js
pmk.deliverystats(function(err, response) {});
```

### Retrieving bounces

You can retrieve bounces associated with your server.

```js
// simple example
pmk.bounces({
  count: 10,
  offset: 0
}, function(err, response) {});

// with messageId
pmk.bounces({
  messageId: '[messageIDHere]'
}, function(err, response) {});

// more sepcific
pmk.bounces({
  count: 10,
  offset: 0,
  type: 'HardBounce',
  inactive: 0,
  emailFilter: 'somewhere.com'
}, function(err, response) {});
```

### Getting a list of tags for bounces on server

```js
pmk.bounceTags(function(err, response) {});
```

### Getting a single bounce

```js
pmk.bounce(bouncId, function(err, response) {});
```

### Getting a single bounce's dump

```js
pmk.bounceDump(bouncId, function(err, response) {});
```

### Activating a deactivated bounce

Callback optional

```js
pmk.bounceActivate(bounceId, function(err, response) {});
```

## Outbound messages

### Retrieving sent messages

```js
// simple example
pmk.outbound({
  count: 10,
  offset: 0
}, function(err, response) {});
```

```js
// more specific
pmk.outbound({
  count: 10,
  offset: 0,
  recipient: 'someone@somewhere.com',
  fromemail: 'fromemail@somewhere.com',
  tag: 'MyTag',
  subject: 'Welcome Email'
}, function(err, response) {});
```

### Getting details for a single sent message

```js
pmk.outboundMessage(messageId, function(err, response) {});
```

### Getting message dump

```js
pmk.outboundMessageDump(messageId, function(err, response) {});
```

## Inbound messages

### Retrieving recieved messages

```js
// simple example
pmk.inbound({
  count: 10,
  offset: 0
}, function(err, response) {});
```

```js
// more specific
pmk.inbound({
  count: 10,
  offset: 0,
  recipient: 'someone@somewhere.com',
  fromemail: 'fromemail@somewhere.com',
  tag: 'MyTag',
  subject: 'Welcome Email',
  mailboxhash: 'mailboxhashvalue'
}, function(err, response) {});
```

### Gettings details for a single recieved message

```js
pmk.inboundMessage(messageId, function(err, response) {});
```

## Sender Signatures

### Getting a list of Sender Signatures

```js
pmk.senders({
  count: 10,
  offset: 0
}, function(err, response) {});
```

### Fetching details for a single sender

```js
pmk.sender(senderId, function(err, response) {});
```

### Creating a Sender Signature

The `reply` and callback are optional

```js
pmk.createSender({
  name: 'Sender Name',
  from: 'senderemail@somewhere.com',
  reply: 'replyto@somewhere.com'
}, function(err, response) {});
```

### Updating a Sender Signature

The `reply` and callback are optional

You cannot update the `from` address

```js
pmk.updateSender(senderId, {
  name: 'Sender Name',
  reply: 'replyto@somewhere.com'
}, function(err, response) {});
```

### Resending a Sender Signature confirmation email

The callback is optional

```js
pmk.resendSender(senderId, function(err, response) {});
```

### Deleting a Sender Signature

The callback is optional

```js
pmk.deleteSender(senderId, function(err, response) {});
```

### Verifying a SPF record

The callback is optional

```js
pmk.verifySPF(senderId, function(err, response) {});
```

### Requesting a new DKIM

The callback is optional

```js
pmk.requestDKIM(senderId, function(err, response) {});
```

## Servers

### Getting a list of servers

```js
pmk.servers({
  count: 10,
  offset: 0,
  name: 'Production'
}, function(err, response) {});
```

### Getting a single server's details

```js
pmk.server(serverId, function(err, response) {});
```

### Creating a new server

```js
// simple example
pmk.createServer({
  name: 'Server Name'
});

// more specific
pmk.createServer({
  name: 'Server Name',
  color: 'red',
  smtp: true,
  raw: true,
  inboundHook: 'https://...',
  bounceHook: 'https://...',
  inboundDomain: 'myDomain'
}, function(err, response) {});
```

### Updating a server

```js
// simple example
pmk.updateServer(serverId, {
  name: 'Server Name'
});

// more specific
pmk.updateServer(serverId, {
  name: 'Server Name',
  color: 'red',
  smtp: true,
  raw: true,
  inboundHook: 'https://...',
  bounceHook: 'https://...',
  inboundDomain: 'myDomain'
}, function(err, response) {});
```

### Deleting a server

The callback is optional

```js
pmk.deleteServer(serverId, function(err, response) {});
```
