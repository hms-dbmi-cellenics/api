// @ts-nocheck
const express = require('express');
const request = require('supertest');
const expressLoader = require('../../src/loaders/express');

const plotController = require('../../src/api.v2/controllers/plotController');

jest.mock('../../src/api.v2/controllers/plotController', () => ({
  getPlotConfig: jest.fn(),
  updatePlotConfig: jest.fn(),
}));

jest.mock('../../src/api.v2/middlewares/authMiddlewares');

const url = '/v2/experiments/mockSomeId/plots/mockPlotUuid';

// per-cell records like spatial QC plot data
const largePlotData = {
  config: {},
  plotData: Array.from({ length: 5000 }, (_, i) => ({
    cellId: i, value: i / 7, zscore: -i / 13, x: i * 1.5, y: i * 2.5,
  })),
};
// what clients see after JSON serialisation (e.g. -0 becomes 0)
const largePlotDataJson = JSON.parse(JSON.stringify(largePlotData));

describe('response compression', () => {
  let app = null;

  beforeEach(async () => {
    const mockApp = await expressLoader(express());
    app = mockApp.app;
  });

  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  const respondWith = (body) => {
    plotController.getPlotConfig.mockImplementationOnce(async (req, res) => { res.json(body); });
  };

  it('Uses brotli when the client accepts it', async () => {
    respondWith(largePlotData);

    const res = await request(app)
      .get(url)
      .set('Accept-Encoding', 'gzip, deflate, br, zstd')
      .buffer(true)
      .parse((r, cb) => {
        let size = 0;
        r.on('data', (chunk) => { size += chunk.length; });
        r.on('end', () => cb(null, size));
      })
      .expect(200);

    expect(res.headers['content-encoding']).toEqual('br');
    expect(res.body).toBeLessThan(JSON.stringify(largePlotData).length / 2);
  });

  it('Falls back to gzip', async () => {
    respondWith(largePlotData);

    const res = await request(app)
      .get(url)
      .set('Accept-Encoding', 'gzip')
      .expect(200);

    expect(res.headers['content-encoding']).toEqual('gzip');
    // supertest decompresses gzip transparently
    expect(res.body).toEqual(largePlotDataJson);
  });

  it('Sends uncompressed responses to clients that accept no encoding', async () => {
    respondWith(largePlotData);

    const res = await request(app)
      .get(url)
      .set('Accept-Encoding', 'identity')
      .expect(200);

    expect(res.headers['content-encoding']).toBeUndefined();
    expect(res.body).toEqual(largePlotDataJson);
  });

  it('Leaves small responses uncompressed', async () => {
    respondWith({ config: {}, plotData: [] });

    const res = await request(app)
      .get(url)
      .set('Accept-Encoding', 'gzip, br')
      .expect(200);

    expect(res.headers['content-encoding']).toBeUndefined();
  });

  it('Delivers compressed error responses intact', async () => {
    plotController.getPlotConfig.mockImplementationOnce(async () => {
      const error = new Error('Something failed');
      error.status = 400;
      error.errors = Array.from({ length: 200 }, (_, i) => ({ path: `.body[${i}]`, message: 'should be valid' }));
      throw error;
    });

    const res = await request(app)
      .get(url)
      .set('Accept-Encoding', 'gzip')
      .expect(400);

    expect(res.headers['content-encoding']).toEqual('gzip');
    expect(res.body.message).toEqual('Something failed');
    expect(res.body.errors).toHaveLength(200);
  });
});
