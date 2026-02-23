
const stub = {
  submitWork: jest.fn(),
};

const WorkSubmitService = jest.fn().mockImplementation(() => stub);

module.exports = WorkSubmitService;
