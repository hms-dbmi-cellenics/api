const { getWebhookUrl } = require('./crypt');
const getLogger = require('./getLogger');
const config = require('../config');

const logger = getLogger();
const sendFailedSlackMessage = async (message, user, process, stateMachineArn) => {
  const { input: { taskName, error } } = message;
  const { experimentId } = message;

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
          type: 'mrkdwn',
          text: `
          *${process}* has failed for experiment *${experimentId}*
          *Step*: ${error ? `${taskName} - ${error}` : taskName}
          *State machine ARN*: ${stateMachineArn}
          *Deployment*: ${config.deploymentName}
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
