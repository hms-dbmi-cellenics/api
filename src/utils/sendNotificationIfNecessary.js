const AWS = require('aws-sdk');
const atob = require('atob');
const config = require('../config/index');
const {
  FAILED,
} = require('../api/general-services/pipeline-manage/constants');
const ExperimentService = require('../api/route-services/experiment');

const sendNotificationEmailIfNecessary = async (process, status, experimentId) => {
  AWS.config.update({ region: config.awsRegion });
  const statusMessage = status === FAILED ? 'has failed' : 'has been successful';
  const experiment = await (new ExperimentService()).getExperimentData(experimentId);
  if (experiment.notifyByEmail.length) {
    const params = {
      Destination: {
        ToAddresses: [experiment.notifyByEmail[0]],
      },
      Message: {
        Body: {
          Text: {
            Charset: 'UTF-8',
            Data: `Your process for ${process} ${statusMessage}.`,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: 'Biomage Pipeline status',
        },
      },
      Source: 'notification@biomage.net',
    };
    const sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise();

    // Handle promise's fulfilled/rejected states
    sendPromise.then(
      (data) => {
        console.log('Email sent successfuly', data.MessageId);
      },
    ).catch(
      (err) => {
        console.error('Error sending email', err, err.stack);
      },
    );
  }
  if (status === FAILED) {
    const feedbackData = {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'plain_text',
            text: `${process} has failed for experiment ${experimentId}`,
          },
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
  }
};

module.exports = sendNotificationEmailIfNecessary;
