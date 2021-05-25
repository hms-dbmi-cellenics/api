const { NotFoundError, OK } = require('../../../utils/responses');

const mockGetProject = jest.fn((projectUuid) => new Promise((resolve) => {
  if (projectUuid === 'unknown-project') {
    throw new NotFoundError('Project not found');
  }

  resolve(OK());
}));

const mockGetExperiments = jest.fn((projectUuid) => new Promise((resolve) => {
  if (projectUuid === 'unknown-project') {
    throw new NotFoundError('Project not found');
  }

  resolve([
    {
      experimentId: 'mock-experiment',
      name: 'someExperiments',
    },
  ]);
}));

const mockUpdateProject = jest.fn((projectUuid) => new Promise((resolve) => {
  if (projectUuid === 'unknown-project') {
    throw new NotFoundError('Project not found');
  }

  resolve(OK());
}));

const mockDeleteProject = jest.fn((projectUuid) => new Promise((resolve) => {
  if (projectUuid === 'unknown-project') {
    throw new NotFoundError('Project not found');
  }

  resolve(OK());
}));

const mock = jest.fn().mockImplementation(() => ({
  getExperiments: mockGetExperiments,
  getProject: mockGetProject,
  updateProject: mockUpdateProject,
  deleteProject: mockDeleteProject,
}));

module.exports = mock;
