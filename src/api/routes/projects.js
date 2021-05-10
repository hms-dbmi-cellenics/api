const ProjectsService = require('../route-services/projects');

const projectsService = new ProjectsService();

module.exports = {
  'projects#update': (req, res, next) => {
    projectsService.updateProject(req.params.projectUuid, req.body)
      .then((data) => res.json(data))
      .catch(next);
  },
};
