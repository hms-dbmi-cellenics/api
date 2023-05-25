const config = require('../../config');

const { ACCOUNT_ID, SUCCEEDED } = require('../../api.v2/constants');

const buildPipelineStatusEmailBody = (experimentId, status, user) => {
  const isHMS = config.awsAccountId === ACCOUNT_ID.HMS;

  const firstname = user.name.split(' ')[0];
  const link = `${config.emailDomainName}/experiments/${experimentId}/data-processing`;
  const successMessage = `
      The data processing pipeline has completed successfully and your data is now ready to explore:<br/>
      <a href="${link}">${link}</a>
      <br />
      <br />
      Happy analysing! <br/>`;
  const failMessage = `
      Unfortunately, when trying to run the analysis the data processing failed for your experiment: <br/>
      <a href="${link}">${link}</a> <br/>
      We are working hard to identify and fix the issue. We will let you know as soon as your data is ready to explore. <br/>
      `;
  const messageToSend = `
        <html>
        <head>
        </head>
        <body>
            <h3>Hello ${firstname},</h3>
            <p>Thanks for using Cellenics! <br/>
            <br />
              ${status === SUCCEEDED ? successMessage : failMessage}<br/><br/>${isHMS ? '' : `
              The Biomage Team`}
              <small> <br/> <br/> You can disable the notifications for this experiment when you start processing it again. </small>
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
        Data: 'Cellenics experiment status',
      },
    },
    Source: isHMS ? 'alex_pickering@hms.harvard.edu' : `notification@${process.env.DOMAIN_NAME}`,
  };
  return params;
};
module.exports = buildPipelineStatusEmailBody;
