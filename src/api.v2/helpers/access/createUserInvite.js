const UserAccess = require('../../model/UserAccess');

const { getAwsUserAttributesByEmail } = require('../../../utils/aws/user');
const sendEmail = require('../../../utils/sendEmail');
const buildUserInvitedEmailBody = require('../../../utils/emailTemplates/buildUserInvitedEmailBody');
const buildUserInvitedNotRegisteredEmailBody = require('../../../utils/emailTemplates/buildUserInvitedNotRegisteredEmailBody');

const OK = require('../../../utils/responses/OK');

const getLogger = require('../../../utils/getLogger');

const logger = getLogger('[AccessModel] - ');

const createUserInvite = async (experimentId, userEmail, role, inviterUser) => {
  let userAttributes;
  let emailBody;

  try {
    userAttributes = await getAwsUserAttributesByEmail(userEmail);

    const userId = userAttributes.find((attr) => attr.Name === 'sub').Value;
    new UserAccess().grantAccess(userId, experimentId, role);
    emailBody = buildUserInvitedEmailBody(userEmail, experimentId, inviterUser);
  } catch (e) {
    if (e.code !== 'UserNotFoundException') {
      throw e;
    }

    logger.log('User has not yet signed up, inviting new user');

    new UserAccess().addToInviteAccess(userEmail, experimentId, role);
    emailBody = buildUserInvitedNotRegisteredEmailBody(userEmail, inviterUser);
  }

  await sendEmail(emailBody);

  return OK();
};

module.exports = createUserInvite;
