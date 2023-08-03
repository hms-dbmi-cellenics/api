// @ts-nocheck
const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

const accessController = require('../../../src/api.v2/controllers/accessController');
const {
  UnauthenticatedError, UnauthorizedError, NotFoundError, OK,
} = require('../../../src/utils/responses');
const AccessRole = require('../../../src/utils/enums/AccessRole');

jest.mock('../../../src/api.v2/middlewares/authMiddlewares');
jest.mock('../../../src/api.v2/controllers/accessController');

const mockUsersList = [
  {
    name: 'Mock Admin',
    email: 'admin@example.com',
    role: AccessRole.ADMIN,
  },
  {
    name: 'Mock User',
    email: 'user@example.com',
    role: AccessRole.OWNER,
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
    accessController.getUserAccess.mockImplementationOnce((req, res) => {
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
    accessController.getUserAccess.mockImplementationOnce(() => {
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

  it('Adding a new user to an experiment returns 200', async (done) => {
    accessController.inviteUser.mockImplementationOnce((req, res) => {
      res.json(OK());
      Promise.resolve();
    });

    request(app)
      .put('/v2/access/mockExperimentId')
      .send({ userEmail: 'user@example.com', role: AccessRole.ADMIN })
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Adding a new user to without authentication returns 401', async (done) => {
    accessController.inviteUser.mockImplementationOnce((req, res) => {
      throw new UnauthenticatedError('The request does not contain an authentication token.');
    });

    request(app)
      .put('/v2/access/mockExperimentId')
      .send({ userEmail: 'user@example.com', role: AccessRole.ADMIN })
      .expect(401)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Adding a new user to an unauthorized experiment returns 403', async (done) => {
    accessController.inviteUser.mockImplementationOnce((req, res) => {
      throw new UnauthorizedError('The user does not have access to this experiment.');
    });

    request(app)
      .put('/v2/access/mockExperimentId')
      .send({ userEmail: 'user@example.com', role: AccessRole.ADMIN })
      .expect(403)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Removing user access from an experiment returns a 200', async (done) => {
    accessController.revokeAccess.mockImplementationOnce((req, res) => {
      res.json(OK());
      Promise.resolve();
    });

    request(app)
      .delete('/v2/access/mockExperimentId')
      .send({ userEmail: 'user@example.com' })
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Removing user access without authentication returns 401', async (done) => {
    accessController.revokeAccess.mockImplementationOnce((req, res) => {
      throw new UnauthenticatedError('The request does not contain an authentication token.');
    });

    request(app)
      .delete('/v2/access/mockExperimentId')
      .send({ userEmail: 'user@example.com' })
      .expect(401)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Removing user access to an unauthorized experiment returns 403', async (done) => {
    accessController.revokeAccess.mockImplementationOnce((req, res) => {
      throw new UnauthorizedError('The user does not have access to this experiment.');
    });

    request(app)
      .delete('/v2/access/mockExperimentId')
      .send({ userEmail: 'user@example.com' })
      .expect(403)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Post-user registration endpoint works correctly', async (done) => {
    accessController.postRegistration.mockImplementationOnce((req, res) => {
      res.json(OK());
      Promise.resolve();
    });

    const mockUserInfo = JSON.stringify({
      userId: 'mockUserId',
      userEmail: 'user@example.com',
    });

    request(app)
      .post('/v2/access/post-registration')
      .send(mockUserInfo)
      .set('Content-type', 'application/json')
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('isUserAuthorized experiment resolves successfully', async (done) => {
    accessController.isUserAuthorized.mockImplementationOnce((req, res) => {
      res.json(true);
    });

    request(app)
      .get('/v2/access/experiment-id/check?url=%2Fv2%2Fexperiments%2Fexperiment-id%2Fqc&method=POST')
      .send()
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
});
