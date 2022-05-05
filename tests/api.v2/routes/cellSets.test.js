// @ts-nocheck
const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

const cellSetsController = require('../../../src/api.v2/controllers/cellSetsController');
const { NotFoundError, OK } = require('../../../src/utils/responses');

jest.mock('../../../src/api.v2/middlewares/authMiddlewares');
jest.mock('../../../src/api.v2/controllers/cellSetsController');

const endpoint = '/v2/experiments/mockExperimentId/cellSets';

const mockPatch = {
  key: '05e036a5-a2ae-4909-99e1-c3b927a584e3', name: 'New Cluster', color: '#3957ff', type: 'cellSets', cellIds: [438, 444, 713, 822, 192, 576, 675],
};

const mockCellSet = {
  cellSets: [
    {
      key: 'louvain',
      name: 'Louvain',
      children: [{
        key: 'louvain-0',
        name: 'Louvain 0',
        children: [1, 2, 4],
      }],
    },
    {
      key: 'scratchpad',
      name: 'Scratchpad',
      children: [],
    },
  ],
};

describe('Cell sets endpoint', () => {
  let app;

  beforeEach(async () => {
    const mockApp = await expressLoader(express());
    app = mockApp.app;
  });

  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('Getting an existing cell set returns 200', (done) => {
    cellSetsController.getCellSets.mockImplementationOnce((req, res) => {
      res.json();
      Promise.resolve();
    });
    request(app)
      .get(endpoint)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Getting a non-existing cell set returns 404', (done) => {
    cellSetsController.getCellSets.mockImplementationOnce(() => {
      throw new NotFoundError('Experiment not found');
    });

    request(app)
      .get(endpoint)
      .expect(404)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Patching cell sets with a valid body content type results in a successful response', (done) => {
    cellSetsController.patchCellSets.mockImplementationOnce((req, res) => {
      res.json();
      Promise.resolve();
    });

    const createNewCellSetJsonMerger = [{
      $match: {
        query: '$[?(@.key == "scratchpad")]',
        value: {
          children: [{
            $insert: {
              index: '-',
              value: mockPatch,
            },
          }],
        },
      },
    }];

    const validContentType = 'application/boschni-json-merger+json';

    request(app)
      .patch(endpoint)
      .set('Content-type', validContentType)
      .send(createNewCellSetJsonMerger)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        // there is no point testing for the values of the response body
        // - if something is wrong, the schema validator will catch it
        return done();
      });
  });

  it('Patching cell sets with an invalid body content type results in a 415', (done) => {
    cellSetsController.patchCellSets.mockImplementationOnce((req, res) => {
      res.json();
      Promise.resolve();
    });

    const createNewCellSetJsonMerger = [{
      $match: {
        query: '$[?(@.key == "scratchpad")]',
        value: {
          children: [{
            $insert: {
              index: '-',
              value: mockPatch,
            },
          }],
        },
      },
    }];

    const invalidContentType = 'application/json';

    request(app)
      .patch(endpoint)
      .set('Content-type', invalidContentType)
      .send(createNewCellSetJsonMerger)
      .expect(415)
      .end((err) => {
        if (err) {
          return done(err);
        }
        // there is no point testing for the values of the response body
        // - if something is wrong, the schema validator will catch it
        return done();
      });
  });
});
