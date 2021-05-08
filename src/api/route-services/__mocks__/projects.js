const mockUpdateProject = jest.fn((projectUuid, body) => {
  if (!projectUuid
    || !body
  ) {
    throw new Error('Invalid body');
  }

  return Promise.resolve({
    name: 'Test project',
    description: '',
    createdDate: '',
    lastModified: '',
    uuid: 'project-1',
    experiments: [],
    lastAnalyzed: null,
    samples: [],
  });
});

const mock = jest.fn().mockImplementation(() => ({
  updateProject: mockUpdateProject,
}));

module.exports = mock;
