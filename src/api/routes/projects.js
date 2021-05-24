const ProjectsService = require('../route-services/projects');

const projectsService = new ProjectsService();

module.exports = {
  'projects#update': (req, res, next) => {
    projectsService.updateProject(req.params.projectUuid, req.body)
      .then((data) => res.json(data))
      .catch(next);
  },
  'projects#delete': (req, res, next) => {
    projectsService.deleteProject(req.params.projectUuid)
      .then((data) => res.json(data))
      .catch(next);
  },
  'projects#get': (req, res, next) => {
    projectsService.getProjects().then((response) => res.json(response)).catch(next);
  },
  'projects#getExperiments': (req, res, next) => {
    projectsService.getExperiments(req.params.projectUuid)
      .then((response) => res.json(response)).catch(next);
  },

};
