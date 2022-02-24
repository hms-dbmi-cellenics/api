const buildUserInvitedEmailBody = (email, experimentId) => {
  const link = `scp.biomage.net/experiments/${experimentId}/data-processing`;

  const messageToSend = `
        <html>
        <head>
        </head>
        <body>
            <h3>Hello, </h3> <br/>
            <p>
              You have been invited to join an experiment! <br/>
              Access it with the link below: <br/>
              <a href="${link}">${link}</a> <br/>
            <p/>
        </body>
      </html>`;


  const params = {
    Destination: {
      ToAddresses: [email],
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
        Data: 'Cellenics experiment invitation',
      },
    },
    Source: 'notification@biomage.net',
  };
  return params;
};
module.exports = buildUserInvitedEmailBody;
