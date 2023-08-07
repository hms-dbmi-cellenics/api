const UserAccess = require('../../model/UserAccess');

const { getAwsUserAttributes } = require('../../../utils/aws/user');
const sendEmail = require('../../../utils/sendEmail');
const buildUserInvitedEmailBody = require('../../../utils/emailTemplates/buildUserInvitedEmailBody');
const buildUserInvitedNotRegisteredEmailBody = require('../../../utils/emailTemplates/buildUserInvitedNotRegisteredEmailBody');

const OK = require('../../../utils/responses/OK');

const getLogger = require('../../../utils/getLogger');

const logger = getLogger('[AccessModel] - ');

const createUserInvite = async (experimentId, invitedUserEmail, role, inviterUser) => {
  let userAttributes;
  let emailBody;

  try {
    userAttributes = await getAwsUserAttributes(invitedUserEmail, 'email');

    const invitedUserId = userAttributes.find((attr) => attr.Name === 'sub').Value;
    await new UserAccess().grantAccess(invitedUserId, experimentId, role);
    emailBody = buildUserInvitedEmailBody(invitedUserEmail, experimentId, inviterUser);
  } catch (e) {
    if (e.code !== 'UserNotFoundException') {
      throw e;
    }

    logger.log('Invited user does not have an account yet. Sending invitation email.');

    await new UserAccess().addToInviteAccess(invitedUserEmail, experimentId, role);
    emailBody = buildUserInvitedNotRegisteredEmailBody(invitedUserEmail, inviterUser);
  }

  try {
    await sendEmail(emailBody);
  } catch (e) {
    logger.error(e);
    // This message is picked up in the ui and transformed to a nice end user message
    throw new Error('NotificationFailure');
  }

  return OK();
};

module.exports = createUserInvite;
