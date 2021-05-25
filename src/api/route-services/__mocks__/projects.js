const { NotFoundError, OK } = require('../../../utils/responses');

const mockGetProject = jest.fn((projectUuid) => new Promise((resolve) => {
  if (projectUuid === 'unknown-project') {
    throw new NotFoundError('Project not found');
  }

  resolve(OK());
}));

const mockGetProjects = jest.fn(() => new Promise((resolve) => {
  const projects = [
    {
      name: 'Project 1',
      uuid: 'project-1',
    },
    {
      name: 'Project 2',
      uuid: 'project-2',
    },
    {
      name: 'Project 3',
      uuid: 'project-3',
    }];

  resolve(projects);
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
  getProjects: mockGetProjects,
  updateProject: mockUpdateProject,
  deleteProject: mockDeleteProject,
}));

module.exports = mock;
