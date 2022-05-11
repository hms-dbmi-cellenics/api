// @ts-nocheck
const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

const accessController = require('../../../src/api.v2/controllers/accessController');
const { NotFoundError } = require('../../../src/utils/responses');

jest.mock('../../../src/api.v2/middlewares/authMiddlewares');
jest.mock('../../../src/api.v2/controllers/accessController');

const mockUsersList = [
  {
    name: 'Mock Admin',
    email: 'admin@example.com',
    role: 'admin',
  },
  {
    name: 'Mock User',
    email: 'user@example.com',
    role: 'owner',
  },
];

describe('User access endpoint', () => {
  let app;

  beforeEach(async () => {
    const mockApp = await expressLoader(express());
    app = mockApp.app;
  });

  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('Getting list of users to an existing experiment returns 200', async (done) => {
    accessController.getExperimentUsers.mockImplementationOnce((req, res) => {
      res.json(mockUsersList);
      Promise.resolve();
    });

    request(app)
      .get('/v2/access/mockExperimentId')
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Getting list of users to an unexisting experiment returns 404', async (done) => {
    accessController.getExperimentUsers.mockImplementationOnce(() => {
      throw new NotFoundError('Experiment not found');
    });

    request(app)
      .get('/v2/access/nonExistentExperimentId')
      .expect(404)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
});
