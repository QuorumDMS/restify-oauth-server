
/**
 * Module dependencies.
 */

var RestifyOAuthServer = require('../../');
var InvalidArgumentError = require('oauth2-server/lib/errors/invalid-argument-error');
var NodeOAuthServer = require('oauth2-server');
var restify = require('restify');
var request = require('supertest');
var should = require('should');

/**
 * Test `RestifyOAuthServer`.
 */

describe('RestifyOAuthServer', function() {
  var app;

  beforeEach(function() {
    app = restify.createServer();

    app.use(restify.acceptParser(app.acceptable));
    app.use(restify.authorizationParser());
    app.use(restify.queryParser());
    app.use(restify.bodyParser());
    app.use(function(req, res, next) {
      if(req.headers['content-type'] === 'application/x-www-form-urlencoded') req.body = req.params;
      return next();
    });
  });

  describe('constructor()', function() {
    it('should throw an error if `model` is missing', function() {
      try {
        new RestifyOAuthServer({});

        should.fail();
      } catch (e) {
        e.should.be.an.instanceOf(InvalidArgumentError);
        e.message.should.equal('Missing parameter: `model`');
      }
    });

    it('should set the `server`', function() {
      var oauth = new RestifyOAuthServer({ model: {} });

      oauth.server.should.be.an.instanceOf(NodeOAuthServer);
    });
  });

  describe('authenticate()', function() {
    it('should return an error if `model` is empty', function(done) {
      var oauth = new RestifyOAuthServer({ model: {} });

      app.get('/', oauth.authenticate());

      request(app.listen())
        .get('/')
        .expect({ error: 'invalid_argument', error_description: 'Invalid argument: model does not implement `getAccessToken()`' })
        .end(done);
    });

    it('should authenticate the request', function(done) {
      var token = { user: {} };
      var model = {
        getAccessToken: function() {
          return token;
        }
      };
      var oauth = new RestifyOAuthServer({ model: model });

      app.get('/', oauth.authenticate(), function(req, res, next) {
        res.send();
        return next();
      });

      request(app.listen())
        .get('/')
        .set('Authorization', 'Bearer foobar')
        .expect(200)
        .end(done);
    });

    it('should cache the authorization token', function(done) {
      var token = { user: {} };
      var model = {
        getAccessToken: function() {
          return token;
        }
      };
      var oauth = new RestifyOAuthServer({ model: model });

      app.get('/', oauth.authenticate(), function(req, res, next) {
        res.oauth.token.should.equal(token);
        res.send();
        next();
      });

      request(app.listen())
        .get('/')
        .set('Authorization', 'Bearer foobar')
        .end(done);
    });
  });

  describe('authorize()', function() {
    it('should cache the authorization code', function(done) {
      var code = { authorizationCode: 123 };
      var model = {
        getAccessToken: function() {
          return { user: {} };
        },
        getClient: function() {
          return { grants: ['authorization_code'], redirectUris: ['http://example.com'] };
        },
        saveAuthorizationCode: function() {
          return code;
        }
      };
      var oauth = new RestifyOAuthServer({ model: model });

      app.post('/', oauth.authorize());

      request(app.listen())
        .post('/?state=foobiz')
        .set('Authorization', 'Bearer foobar')
        .send({ client_id: 12345, response_type: 'code' })
        .end(done);
    });

    it('should return a `location` header with the error', function(done) {
      var model = {
        getAccessToken: function() {
          return { user: {} };
        },
        getClient: function() {
          return { grants: ['authorization_code'], redirectUris: ['http://example.com'] };
        },
        saveAuthorizationCode: function() {
          return {};
        }
      };
      var oauth = new RestifyOAuthServer({ model: model });

      app.use();

      app.post('/', oauth.authorize());

      request(app.listen())
        .post('/?state=foobiz')
        .set('Authorization', 'Bearer foobar')
        .send({ client_id: 12345 })
        .expect('Location', 'http://example.com/?error=invalid_request&error_description=Missing%20parameter%3A%20%60response_type%60&state=foobiz')
        .end(done);
    });

    it('should return a `location` header with the code', function(done) {
      var model = {
        getAccessToken: function() {
          return { user: {} };
        },
        getClient: function() {
          return { grants: ['authorization_code'], redirectUris: ['http://example.com'] };
        },
        saveAuthorizationCode: function() {
          return { authorizationCode: 123 };
        }
      };
      var oauth = new RestifyOAuthServer({ model: model });

      app.post('/', oauth.authorize());

      request(app.listen())
        .post('/?state=foobiz')
        .set('Authorization', 'Bearer foobar')
        .send({ client_id: 12345, response_type: 'code' })
        .expect('Location', 'http://example.com/?code=123&state=foobiz')
        .end(done);
    });

    it('should return an error if `model` is empty', function(done) {
      var oauth = new RestifyOAuthServer({ model: {} });

      app.post('/', oauth.authorize());

      request(app)
        .post('/')
        .expect({ error: 'invalid_argument', error_description: 'Invalid argument: model does not implement `getClient()`' })
        .end(done);
    });
  });

  describe('token()', function() {
    it('should cache the authorization token', function(done) {
      var token = { accessToken: 'foobar', client: {}, user: {} };
      var model = {
        getClient: function() {
          return { grants: ['password'] };
        },
        getUser: function() {
          return {};
        },
        saveToken: function() {
          return token;
        }
      };
      var oauth = new RestifyOAuthServer({ model: model });

      app.use(oauth.token());

      app.post('/', function(req, res, next) {
        res.oauth.token.should.equal(token);

        next();
      });

      request(app.listen())
        .post('/')
        .send('client_id=foo&client_secret=bar&grant_type=password&username=qux&password=biz')
        .expect({ access_token: 'foobar', token_type: 'bearer' })
        .end(done);
    });

    it('should return an `access_token`', function(done) {
      var model = {
        getClient: function() {
          return { grants: ['password'] };
        },
        getUser: function() {
          return {};
        },
        saveToken: function() {
          return { accessToken: 'foobar', client: {}, user: {} };
        }
      };
      var oauth = new RestifyOAuthServer({ model: model });

      app.post('/', oauth.token());

      request(app.listen())
        .post('/')
        .send('client_id=foo&client_secret=bar&grant_type=password&username=qux&password=biz')
        .expect({ access_token: 'foobar', token_type: 'bearer' })
        .end(done);
    });

    it('should return a `refresh_token`', function(done) {
      var model = {
        getClient: function() {
          return { grants: ['password'] };
        },
        getUser: function() {
          return {};
        },
        saveToken: function() {
          return { accessToken: 'foobar', client: {}, refreshToken: 'foobiz', user: {} };
        }
      };
      var oauth = new RestifyOAuthServer({ model: model });

      app.post('/', oauth.token());

      request(app.listen())
        .post('/')
        .send('client_id=foo&client_secret=bar&grant_type=password&username=qux&password=biz')
        .expect({ access_token: 'foobar', refresh_token: 'foobiz', token_type: 'bearer' })
        .end(done);
    });

    it('should return an error if `model` is empty', function(done) {
      var oauth = new RestifyOAuthServer({ model: {} });

      app.post('/', oauth.token());

      request(app.listen())
        .post('/')
        .expect({ error: 'invalid_argument', error_description: 'Invalid argument: model does not implement `getClient()`' })
        .end(done);
    });
  });
});
