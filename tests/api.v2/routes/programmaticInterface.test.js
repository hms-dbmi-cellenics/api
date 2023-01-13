const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

const getAwsProgrammaticClientInfo = require('../../../src/api.v2/helpers/cognito/getAwsProgrammaticClientInfo');

jest.mock('../../../src/api.v2/helpers/cognito/getAwsProgrammaticClientInfo');
jest.mock('../../../src/api.v2/helpers/cognito/getAwsPoolId');


describe('tests for programmatic interface route', () => {
  let app = null;

  beforeEach(async () => {
    const mockApp = await expressLoader(express());
    app = mockApp.app;
  });

  it('sending a remove request works', async (done) => {
    request(app)
      .get('/v2/programmaticInterfaceClient')
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }

        return done();
      });
  });

  it('sending an empty request works', async (done) => {
    getAwsProgrammaticClientInfo.mockImplementationOnce(() => { throw new Error('test error'); });
    request(app)
      .get('/v2/programmaticInterfaceClient')
      .expect(500)
      .end((err) => done(err));
  });
});
