# Restify OAuth Server [![Build Status](https://travis-ci.org/AndrewAskins/restify-oauth-server.png?branch=master)](https://travis-ci.org/AndrewAskins/restify-oauth-server)

Complete, compliant and well tested module for implementing an OAuth2 Server/Provider with [restify](https://github.com/strongloop/express) in [node.js](http://nodejs.org/). This module is a fork of express-oauth-server.

This is a restify wrapper for [oauth2-server](https://github.com/thomseddon/node-oauth2-server).

## Installation

    $ npm install restify-oauth-server

## Quick Start

The module provides two middlewares - one for granting tokens and another to authorise them. `restify-oauth-server` and, consequently `oauth2-server`, expect the request body to be parsed already.
The following example uses restify's '`body-parser` but you may opt for an alternative library.

```js
var restify = require('restify');
var OAuthServer = require('restify-oauth-server');

var server = restify.createServer();

server.oauth = new OAuthServer({
  model: {}, // See https://github.com/thomseddon/node-oauth2-server for specification
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.authorizationParser());
server.use(restify.bodyParser());

// Node Oauth2 Server expects the token request to be x-www-url-formencoded according to the Oauth2 spec
// Restify's body parser puts formencoded params in req.params, so we'll need a quick little bit of middleware to copy them over to the body
server.use(function(req, res, next) {
  if(req.headers['content-type'] === 'application/x-www-url-formencoded') req.body = req.params;
  return next();
});

server.post('/token', server.oauth.token());

server.get('/secret', server.oauth.authenticate(), function(req, res, next) {
  res.send('Authenticated!');
});

server.listen(3000);
```

You can find examples in the examples folder for different databases, but I haven't updated them or tested them yet, so take them for what they are. 