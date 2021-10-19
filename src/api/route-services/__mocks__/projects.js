const { NotFoundError, OK } = require('../../../utils/responses');
const MockDataFactory = require('./MockDataFactory');

const mockCreateProject = jest.fn(() => Promise.resolve(OK()));

const mockGetProject = jest.fn((projectUuid) => new Promise((resolve) => {
  if (projectUuid === 'unknown-project') {
    throw new NotFoundError('Project not found');
  }
  const dataFactory = new MockDataFactory({ projectId: projectUuid });
  resolve(dataFactory.getProject());
}));

const mockGetProjects = jest.fn(() => new Promise((resolve) => {
  const dataFactory = new MockDataFactory();
  resolve([dataFactory.getProject()]);
}));

const mockGetExperiments = jest.fn((projectUuid) => new Promise((resolve) => {
  const dataFactory = new MockDataFactory({ projectId: projectUuid });

  resolve([
    dataFactory.getExperiment(),
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
  createProject: mockCreateProject,
  getExperiments: mockGetExperiments,
  getProject: mockGetProject,
  getProjects: mockGetProjects,
  updateProject: mockUpdateProject,
  deleteProject: mockDeleteProject,
}));

module.exports = mock;
