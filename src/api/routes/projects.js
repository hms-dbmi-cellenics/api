const ProjectsService = require('../route-services/projects');

const {
  expressAuthorizationMiddleware,
  expressAuthenticationOnlyMiddleware,
} = require('../../utils/authMiddlewares');

const projectsService = new ProjectsService();

module.exports = {
  'projects#create': [
    expressAuthenticationOnlyMiddleware,
    (req, res, next) => {
      projectsService.createProject(req.params.projectUuid, req.body)
        .then((data) => res.json(data))
        .catch(next);
    }],
  'projects#update': [
    expressAuthenticationOnlyMiddleware,
    (req, res, next) => {
      projectsService.updateProject(req.params.projectUuid, req.body)
        .then((data) => res.json(data))
        .catch(next);
    }],
  'projects#delete': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      projectsService.deleteProject(req.params.projectUuid)
        .then((data) => res.json(data))
        .catch(next);
    }],
  'projects#get': [
    expressAuthenticationOnlyMiddleware,
    (req, res, next) => {
      projectsService.getProjects(req.user).then((response) => {
        res.json(response);
      }).catch(next);
    },
  ],
  'projects#getExperiments': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      projectsService.getExperiments(req.params.projectUuid)
        .then((response) => res.json(response)).catch(next);
    }],
};
