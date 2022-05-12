const UserAccess = require('../../model/UserAccess');

const { getAwsUserAttributesByEmail } = require('../../../utils/aws/user');
const sendEmail = require('../../../utils/send-email');
const buildUserInvitedEmailBody = require('../../../utils/emailTemplates/buildUserInvitedEmailBody');
const buildUserInvitedNotRegisteredEmailBody = require('../../../utils/emailTemplates/buildUserInvitedNotRegisteredEmailBody');

const OK = require('../../../utils/responses/OK');

const getLogger = require('../../../utils/getLogger');

const logger = getLogger('[AccessModel] - ');

const createUserInvite = async (experimentId, userEmail, role, inviterUser) => {
  let userAttributes;
  try {
    userAttributes = await getAwsUserAttributesByEmail(userEmail);
  } catch (e) {
    if (e.code !== 'UserNotFoundException') {
      throw e;
    }

    logger.log('User has not yet signed up, inviting new user');
  }


  let emailBody;
  if (!userAttributes) {
    new UserAccess().addToInviteAccess(userEmail, experimentId, role);
    emailBody = buildUserInvitedNotRegisteredEmailBody(userEmail, inviterUser);
    // User is added to experiment after they registered using post-register-lambda defined in IAC.
  } else {
    const userSub = userAttributes.find((attr) => attr.Name === 'sub').Value;
    new UserAccess().grantAccess(userSub, experimentId, role);
    emailBody = buildUserInvitedEmailBody(userEmail, experimentId, inviterUser);
  }

  await sendEmail(emailBody);

  return OK();
};

module.exports = createUserInvite;