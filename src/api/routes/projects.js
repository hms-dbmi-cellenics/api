const ProjectsService = require('../route-services/projects');

const { expressAuthenticationOnlyMiddleware } = require('../../utils/authMiddlewares');

const projectsService = new ProjectsService();

module.exports = {
  'projects#update': [
    expressAuthenticationOnlyMiddleware,
    (req, res, next) => {
      projectsService.updateProject(req.params.projectUuid, req.body)
        .then((data) => res.json(data))
        .catch(next);
    }],
  'projects#delete': [
    expressAuthenticationOnlyMiddleware,
    (req, res, next) => {
      projectsService.deleteProject(req.params.projectUuid)
        .then((data) => res.json(data))
        .catch(next);
    }],

  'projects#get': [
    expressAuthenticationOnlyMiddleware,
    (req, res, next) => {
      projectsService.getProjects().then((response) => res.json(response)).catch(next);
    },
  ],
};
