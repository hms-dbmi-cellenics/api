const { NotFoundError, OK } = require('../../../utils/responses');

const mockGetProject = jest.fn((projectUuid) => new Promise((resolve) => {
  if (projectUuid === 'unknown-project') {
    throw new NotFoundError('Project not found');
  }

  resolve(OK());
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
  getProject: mockGetProject,
  updateProject: mockUpdateProject,
  deleteProject: mockDeleteProject,
}));

module.exports = mock;
