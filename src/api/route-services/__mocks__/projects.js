const { OK } = require('../../../utils/responses');
const MockDataFactory = require('./MockDataFactory');

const mockCreateProject = jest.fn(() => Promise.resolve(OK()));

const mockGetProject = jest.fn((projectUuid) => new Promise((resolve) => {
  const dataFactory = new MockDataFactory({ projectId: projectUuid });

  resolve(dataFactory.getProject());
}));

const mockGetProjects = jest.fn(() => (
  new Promise((resolve) => {
    const dataFactory = new MockDataFactory();
    const projects = [dataFactory.getProject()];

    resolve(projects);
  })
));

const mockGetExperiments = jest.fn((projectUuid) => (
  new Promise((resolve) => {
    const dataFactory = new MockDataFactory({ projectId: projectUuid });

    resolve([
      dataFactory.getExperiment(),
    ]);
  })
));

const mockUpdateProject = jest.fn(() => (
  new Promise((resolve) => {
    resolve(OK());
  })
));

const mockDeleteProject = jest.fn(() => (
  new Promise((resolve) => {
    resolve(OK());
  })
));

const mock = jest.fn().mockImplementation(() => ({
  createProject: mockCreateProject,
  getExperiments: mockGetExperiments,
  getProject: mockGetProject,
  getProjects: mockGetProjects,
  updateProject: mockUpdateProject,
  deleteProject: mockDeleteProject,
}));

module.exports = mock;
