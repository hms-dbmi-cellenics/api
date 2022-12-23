const _ = require('lodash');
const getLogger = require('../../../../../utils/getLogger');

const constructPipelineStep = require('./constructPipelineStep');

const logger = getLogger();

const buildStateMachineDefinition = (skeleton, context) => {
  logger.log('Constructing pipeline steps...');
  const stateMachine = _.cloneDeepWith(skeleton, (o) => {
    if (_.isObject(o) && o.XStepType) {
      return _.omit(constructPipelineStep(context, o), ['XStepType', 'XConstructorArgs']);
    }
    return undefined;
  });

  return stateMachine;
};

module.exports = buildStateMachineDefinition;
