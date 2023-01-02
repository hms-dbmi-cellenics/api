const { getWebhookUrl } = require('./crypt');
const getLogger = require('./getLogger');

const logger = getLogger();
const sendFailedSlackMessage = async (message, user, process, stateMachineArn) => {
  console.log('*** inside sendFailedSlackMessage');
  console.log('*** message', message);
  console.log('*** user', user);
  console.log('*** process', process);
  console.log('*** stateMachineArn', stateMachineArn);

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
          type: 'plain_text',
          text: `
          The process for ${process} has failed for experiment ${experimentId}
          Step: ${message.input.taskName ? message.input.taskName : 'timeout'}
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
