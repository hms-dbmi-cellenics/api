
const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

jest.mock('../../../src/api/route-services/access/index', () => jest.fn().mockImplementation(() => ({
  inviteUser: jest.fn(() => new Promise((resolve) => resolve({ data: { code: '200' } }))),
})));
jest.mock('../../../src/utils/authMiddlewares');

describe('User access endpoint', () => {
  let app;
  const inviteRequest = {
    userEmail: 'someEmail@emails.com',
    projectUuid: 'someProjectUuid',
    role: 'overlord',
  };

  beforeEach(async () => {
    const mockApp = await expressLoader(express());
    app = mockApp.app;
  });

  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('User is invited if correct properties are passed', async (done) => {
    request(app)
      .put('/v1/access/someExperimentIdasdxzczcx')
      .send(inviteRequest)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Fails if there are missing arguments', async (done) => {
    request(app)
      .put('/v1/access/someExperimentIdasdxzczcx')
      .send({ projectUuid: 'proj-id-asd' })
      .expect(400)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
});
