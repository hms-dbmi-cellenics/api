const nodemailer = require('nodemailer');
const {
  FAILED,
} = require('../api/general-services/pipeline-manage/constants');
const ExperimentService = require('../api/route-services/experiment');

const sendNotificationEmailIfNecessary = async (process, status, experimentId) => {
  const statusMessage = status === FAILED ? 'has failed' : 'has been successful';
  const experiment = await (new ExperimentService()).getExperimentData(experimentId);
  if (experiment.notifyByEmail.length) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
      // initial test - we need to get this from the environment variables
        user: 'notification.biomage@gmail.com',
        pass: 'cWMnJuz%J5??R23w',
      },
    });
    const mailOptions = {
      from: 'notification.biomage@gmail.com',
      to: experiment.notifyByEmail[0],
      subject: 'Biomage Pipeline status',
      text: `Your process for ${process} ${statusMessage}.`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
      } else {
        console.log(`Email sent: ${info.response}`);
      }
    });
  }
};

module.exports = sendNotificationEmailIfNecessary;
