const { getWebhookUrl } = require('./crypt');
const getLogger = require('./getLogger');

const logger = getLogger();
const sendFailedSlackMessage = async (message, user, experiment) => {
  const { experimentId } = message;

  const process = message.input.processName;
  // THIS NEEDS TO CHANGE ONCE WE CHANGE THE NAME TO QC IN EXPERIMENTS/META
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
  const r = await fetch(getWebhookUrl(), {
    method: 'POST',
    body: JSON.stringify(feedbackData),
  });
  if (!r.ok) {
    throw new Error('Invalid status code returned.', r);
  }
  logger.log('Slack message sent.');
};

module.exports = sendFailedSlackMessage;
