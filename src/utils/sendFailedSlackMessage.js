const atob = require('atob');
const ExperimentService = require('../api/route-services/experiment');

const sendFailedSlackMessage = async (message, user) => {
  const { experimentId } = message;
  // this needs to change once we change the name to qc in experiments/meta
  const process = message.input.processName === 'qc' ? 'pipeline' : message.input.processName;
  const experiment = await (new ExperimentService()).getExperimentData(experimentId);
  const stateMachineArn = process === 'qc' ? experiment.meta.pipeline.stateMachineArn : experiment.meta[process].stateMachineArn;

  const userContext = [
    {
      type: 'mrkdwn',
      text: '*User email:*',
    },
    {
      type: 'mrkdwn',
      text: user.email,
    },

    {
      type: 'mrkdwn',
      text: '*User name:*',
    },
    {
      type: 'plain_text',
      text: user.name,
    },

    {
      type: 'mrkdwn',
      text: '*User UUID:*',
    },
    {
      type: 'plain_text',
      text: user.sub,
    },
  ];
  const feedbackData = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: `
          The process for ${process} has failed for experiment ${experimentId} 
          Step: ${message.input.taskName} 
          State machine arn: ${stateMachineArn} 
          `,
        },
      },
      {
        type: 'context',
        elements: [
          ...userContext,
        ],
      },
    ],
  };
  // feedback channel
  const HOOK_URL = 'aHR0cHM6Ly9ob29rcy5zbGFjay5jb20vc2VydmljZXMvVDAxNTVEWkZWTTAvQjAxOVlCQVJYSjkvTWNwRnF5RGtHSmE1WTd0dGFSZHpoQXNQ'; // pragma: allowlist secret

  try {
    const r = await fetch(atob(HOOK_URL), {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    });

    if (!r.ok) {
      throw new Error('Invalid status code returned.');
    }
  } catch (e) {
    console.error('Error sending failed service message: ', e);
  }
};

module.exports = sendFailedSlackMessage;
