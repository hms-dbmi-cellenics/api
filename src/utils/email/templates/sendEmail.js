const AWS = require('aws-sdk');
const config = require('../../../config/index');

const sendEmail = (params) => {
  const ses = new AWS.SES({
    region: config.awsRegion,
    apiVersion: '2010-12-01',
  });
  return ses.sendEmail(params).promise();
};

module.exports = sendEmail;
