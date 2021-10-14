const AWS = require('aws-sdk');
const config = require('../config/index');
const {
  SUCCEEDED,
} = require('../api/general-services/pipeline-manage/constants');
const ExperimentService = require('../api/route-services/experiment');

const sendEmailIfNecessary = async (process, status, experimentId, user) => {
  AWS.config.update({ region: config.awsRegion });
  const experiment = await (new ExperimentService()).getExperimentData(experimentId);
  const firstname = user.name.split(' ')[0];
  const link = `scp.biomage.net/experiments/${experimentId}/data-processing`;

  const successMessage = `
      The data processing pipeline has completed successfully and your data is now ready to explore:<br/>
      <a href="${link}">${link}</a>
      Happy analysing!`;

  const failMessage = `
  Unfortunately, when trying to run the analysis the process for ${process} failed for your experiment: <br/>
  <a href="${link}">${link}</a> <br/>
  Try running the process one more time. <br/>
  We are working hard to identify and fix the issue. We will let you know as soon as your data is ready to explore. <br/>
  `;
  const message = `
        <html>
        <head>
        </head>
        <body>
            <h1>Hello ${firstname},</h1>
            <p>Thanks for uploading a dataset to Cellscope! <br/>
              ${status === SUCCEEDED ? successMessage : failMessage}
                The Biomage Team 
            <p/>
        </body>
      </html>`;


  if (experiment.notifyByEmail) {
    const params = {
      Destination: {
        ToAddresses: [user.email],
      },
      Message: {
        Body: {
          Text: {
            Charset: 'UTF-8',
            Data: message,
          },
          Html: {
            Charset: 'UTF-8',
            Data: message,
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
};

module.exports = sendEmailIfNecessary;
