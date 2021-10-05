const nodemailer = require('nodemailer');
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
  // if (experiment.notifyByEmail.length) {
  const html_format = `<html>
<head></head>
<body>
  <h1>Amazon SES Test (SDK for JavaScript in Node.js)</h1>
  <p>This email was sent with
    <a href='https://aws.amazon.com/ses/'>Amazon SES</a> using the
    <a href='https://aws.amazon.com/sdk-for-node-js/'>
      AWS SDK for JavaScript in Node.js</a>.</p>
</body>
</html>`;
  const params = {
    Destination: { /* required */
      ToAddresses: ['stefan@biomage.net'],
      BccAddresses: [],
    },
    Message: { /* required */
      Body: { /* required */
        Html: {
          Charset: 'UTF-8',
          Data: 'This message body contains HTML formatting. It can, for example, contain links like this one: <a class="ulink" href="http://docs.aws.amazon.com/ses/latest/DeveloperGuide" target="_blank">Amazon SES Developer Guide</a>.',
        },
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
  // const transporter = nodemailer.createTransport({
  //   service: 'gmail',
  //   auth: {
  //   // initial test - we need to get this from the environment variables
  //     user: 'notification.biomage@gmail.com',
  //     pass: 'cWMnJuz%J5??R23w',
  //   },
  // });
  // const mailOptions = {
  //   from: 'notification.biomage@gmail.com',
  //   to: experiment.notifyByEmail[0],
  //   subject: 'Biomage Pipeline status',
  //   text: `Your process for ${process} ${statusMessage}.`,
  // };
  // transporter.sendMail(mailOptions, (error, info) => {
  //   if (error) {
  //     console.log(error);
  //   } else {
  //     console.log(`Email sent: ${info.response}`);
  //   }
  // });
  // }
};

module.exports = sendNotificationEmailIfNecessary;
