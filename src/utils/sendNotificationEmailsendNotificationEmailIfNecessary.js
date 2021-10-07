const AWS = require('aws-sdk');
const config = require('../config/index');
const {
  FAILED,
} = require('../api/general-services/pipeline-manage/constants');
const ExperimentService = require('../api/route-services/experiment');

const sendNotificationEmailIfNecessary = async (process, status, experimentId) => {
  AWS.config.update({ region: config.awsRegion });
  console.log('REGION IS ', config.awsRegion);
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
        console.log('WORKEd', data.MessageId);
      },
    ).catch(
      (err) => {
        console.error('ERRORRRRR', err, err.stack);
      },
    );
  }
};

module.exports = sendNotificationEmailIfNecessary;
