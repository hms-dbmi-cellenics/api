const AWS = require('aws-sdk');
const config = require('../config/index');
const {
  SUCCEEDED,
} = require('../api/general-services/pipeline-manage/constants');
// const ExperimentService = require('../api/route-services/experiment');

const sendEmail = async (experimentId, status, user) => {
  const ses = new AWS.SES({
    region: config.awsRegion,
    apiVersion: '2010-12-01',
  });
  // const experiment = await (new ExperimentService()).getExperimentData(experimentId);

  const firstname = user.name.split(' ')[0];
  const link = `scp.biomage.net/experiments/${experimentId}/data-processing`;
  const successMessage = `
      The data processing pipeline has completed successfully and your data is now ready to explore:<br/>
      <a href="${link}">${link}</a>
      Happy analysing!`;
  console.log('STATUS IS ', status);
  const failMessage = `
  Unfortunately, when trying to run the analysis the data processing failed for your experiment: <br/>
  <a href="${link}">${link}</a> <br/>
  Try running the process one more time. <br/>
  We are working hard to identify and fix the issue. We will let you know as soon as your data is ready to explore. <br/>
  `;
  const messageToSend = `
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


  const params = {
    Destination: {
      ToAddresses: [user.email],
    },
    Message: {
      Body: {
        Text: {
          Charset: 'UTF-8',
          Data: messageToSend,
        },
        Html: {
          Charset: 'UTF-8',
          Data: messageToSend,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Biomage Pipeline status',
      },
    },
    Source: 'notification@biomage.net',
  };
  const sendPromise = ses.sendEmail(params).promise();

  sendPromise.then(
    (data) => {
      console.log('Email sent successfuly', data.MessageId);
    },
  ).catch(
    (err) => {
      console.error('Error sending email', err, err.stack);
    },
  );
};

module.exports = sendEmail;
