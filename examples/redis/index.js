
/**
 * Module dependencies.
 */

var restify = require('restify');
var oauthServer = require('oauth2-server');

// Create an Express application.
var app = restify.createServer();

server.use(restify.acceptParser(server.acceptable));
server.use(restify.authorizationParser());
server.use(restify.bodyParser());

// Node Oauth2 Server expects the token request to be x-www-url-formencoded according to the Oauth2 spec
// Restify's body parser puts formencoded params in req.params, so we'll need a quick little bit of middleware to copy them over to the body
server.use(function(req, res, next) {
  if(req.headers['content-type'] === 'application/x-www-url-formencoded') req.body = req.params;
  return next();
});

// Add OAuth server.
app.oauth = oauthServer({
  model: require('./model')
});

// Post token.
app.post('/oauth/token', app.oauth.token());

// Get secret.
app.get('/secret', app.oauth.authorize(), function(req, res) {
  // Will require a valid access_token.
  res.send('Secret area');
});

app.get('/public', function(req, res) {
  // Does not require an access_token.
  res.send('Public area');
});

// Start listening for requests.
app.listen(3000);
