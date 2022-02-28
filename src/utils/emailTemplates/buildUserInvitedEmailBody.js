const buildUserInvitedEmailBody = (email, experimentId, inviterUser) => {
  const link = `scp.biomage.net/experiments/${experimentId}/data-exploration`;

  const messageToSend = `
        <html>
        <head>
        </head>
        <body>
            <p>
              Hello, <br/>
              Your collaborator ${inviterUser.email} has invited you to explore their single cell RNA-seq project in Cellenics. <br/><br/>
              Access it with the link below: <br/>
              <a href="${link}">${link}</a> <br/> <br/>
              Cellenics is a user-friendly online tool for single cell RNA-seq data analysis. <br/>
              The platform is designed specifically for biologists, and it's completely free for academic researchers.<br/><br/>
              More information about Cellenics can be found at <a href="https://biomage.net">biomage.net</a>.<br/><br/>
              If you need help or have any questions, please contact us at hello@biomage.net. <br/><br/>
              Best Regards, <br/>
              Cellenics team
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
        Data: 'Invitation to join a project in Cellenics',
      },
    },
    Source: 'notification@biomage.net',
  };
  return params;
};
module.exports = buildUserInvitedEmailBody;
