const waitForWorkerReady = require('../../../../src/api.v2/helpers/worker/waitForWorkerReady');
const getWorkerStatus = require('../../../../src/api.v2/helpers/worker/getWorkerStatus');

jest.mock('../../../../src/api.v2/helpers/worker/getWorkerStatus');

describe('waitForWorkerReady', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Returns ready when worker becomes ready before timeout', async () => {
    getWorkerStatus.mockResolvedValue({
      worker: {
        ready: true,
        restartCount: 0,
        started: true,
        status: 'Running',
      },
    });

    const result = await waitForWorkerReady('test-experiment', 120000, 5000);

    expect(result).toBe('ready');
    expect(getWorkerStatus).toHaveBeenCalledTimes(1);
    expect(getWorkerStatus).toHaveBeenCalledWith('test-experiment');
  });

  it('Returns ready when worker becomes ready after several polls', async () => {
    getWorkerStatus
      .mockResolvedValueOnce({
        worker: {
          ready: false,
          restartCount: 0,
          started: true,
          status: 'Starting',
        },
      })
      .mockResolvedValueOnce({
        worker: {
          ready: false,
          restartCount: 0,
          started: true,
          status: 'Starting',
        },
      })
      .mockResolvedValueOnce({
        worker: {
          ready: true,
          restartCount: 0,
          started: true,
          status: 'Running',
        },
      });

    const result = await waitForWorkerReady('test-experiment', 120000, 100);

    expect(result).toBe('ready');
    expect(getWorkerStatus).toHaveBeenCalledTimes(3);
  });

  it('Returns timeout when worker does not become ready within timeout', async () => {
    getWorkerStatus.mockResolvedValue({
      worker: {
        ready: false,
        restartCount: 0,
        started: true,
        status: 'Starting',
      },
    });

    const result = await waitForWorkerReady('test-experiment', 150, 100);

    expect(result).toBe('timeout');
    expect(getWorkerStatus).toHaveBeenCalledTimes(2);
  });

  it('Handles null worker status gracefully', async () => {
    getWorkerStatus.mockResolvedValue({
      worker: null,
    });

    const result = await waitForWorkerReady('test-experiment', 150, 100);

    expect(result).toBe('timeout');
    expect(getWorkerStatus).toHaveBeenCalledTimes(2);
  });

  it('Handles undefined worker status gracefully', async () => {
    getWorkerStatus.mockResolvedValue({});

    const result = await waitForWorkerReady('test-experiment', 150, 100);

    expect(result).toBe('timeout');
    expect(getWorkerStatus).toHaveBeenCalledTimes(2);
  });

  it('Handles worker with missing ready property gracefully', async () => {
    getWorkerStatus.mockResolvedValue({
      worker: {
        restartCount: 0,
        started: true,
        status: 'Starting',
      },
    });

    const result = await waitForWorkerReady('test-experiment', 150, 100);

    expect(result).toBe('timeout');
    expect(getWorkerStatus).toHaveBeenCalledTimes(2);
  });

  it('Polls at the correct interval', async () => {
    getWorkerStatus
      .mockResolvedValueOnce({
        worker: {
          ready: false,
          restartCount: 0,
          started: true,
          status: 'Starting',
        },
      })
      .mockResolvedValueOnce({
        worker: {
          ready: true,
          restartCount: 0,
          started: true,
          status: 'Running',
        },
      });

    const result = await waitForWorkerReady('test-experiment', 120000, 100);

    expect(result).toBe('ready');
    expect(getWorkerStatus).toHaveBeenCalledTimes(2);
  });

  it('Uses default timeout and interval when not provided', async () => {
    getWorkerStatus.mockResolvedValue({
      worker: {
        ready: true,
        restartCount: 0,
        started: true,
        status: 'Running',
      },
    });

    const result = await waitForWorkerReady('test-experiment');

    expect(result).toBe('ready');
    expect(getWorkerStatus).toHaveBeenCalledTimes(1);
  });

  it('Stops polling once worker becomes ready', async () => {
    getWorkerStatus
      .mockResolvedValueOnce({
        worker: {
          ready: false,
          restartCount: 0,
          started: true,
          status: 'Starting',
        },
      })
      .mockResolvedValueOnce({
        worker: {
          ready: true,
          restartCount: 0,
          started: true,
          status: 'Running',
        },
      })
      .mockResolvedValueOnce({
        worker: {
          ready: true,
          restartCount: 0,
          started: true,
          status: 'Running',
        },
      });

    const result = await waitForWorkerReady('test-experiment', 120000, 100);

    expect(result).toBe('ready');
    // Should only call twice - once when not ready, once when ready, and stop
    expect(getWorkerStatus).toHaveBeenCalledTimes(2);
  });
});
