const config = require('../../config');
const getDomainSpecificContent = require('../../config/getDomainSpecificContent');


const buildUserInvitedNotRegisteredEmailBody = (email, inviterUser) => {
  const { notificationEmail, moreEmailInfo } = getDomainSpecificContent();

  const messageToSend = `
        <html>
        <head>
        </head>
        <body>
            <p>
              Hello, <br/>
              Your collaborator ${inviterUser.email} has invited you to explore their single cell RNA-seq project in Cellenics. <br/><br/>
              You need to create a Cellenics account in order to access the project. <br/>
              Register at <a href="${config.emailDomainName}">${config.emailDomainName}</a> using this email address.<br/> <br/>

              Cellenics is a user-friendly online tool for single cell RNA-seq data analysis. <br/>
              The platform is designed specifically for biologists, and it's completely free for academic researchers.<br/><br/>${moreEmailInfo}
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
    Source: notificationEmail,
  };
  return params;
};
module.exports = buildUserInvitedNotRegisteredEmailBody;
