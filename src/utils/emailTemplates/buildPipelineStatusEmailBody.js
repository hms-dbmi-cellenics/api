const config = require('../../config');
const {
  SUCCEEDED,
} = require('../../api/general-services/pipeline-manage/constants');
const { DOMAIN_NAME } = require('../../api.v2/helpers/pipeline/constants');

const buildPipelineStatusEmailBody = (experimentId, status, user) => {
  const firstname = user.name.split(' ')[0];
  const link = `${config.corsOriginUrl}/experiments/${experimentId}/data-processing`;
  const successMessage = `
      The data processing pipeline has completed successfully and your data is now ready to explore:<br/>
      <a href="${link}">${link}</a>
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
              ${status === SUCCEEDED ? successMessage : failMessage}<br/><br/>
                ${config.domainName === DOMAIN_NAME.HMS ? '' : 'The Biomage Team'}
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
    Source: 'notification@biomage.net',
  };
  return params;
};
module.exports = buildPipelineStatusEmailBody;
