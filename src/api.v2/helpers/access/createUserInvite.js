const UserAccess = require('../../model/UserAccess');

const { getAwsUserAttributesByEmail } = require('../../../utils/aws/user');
const sendEmail = require('../../../utils/sendEmail');
const buildUserInvitedEmailBody = require('../../../utils/emailTemplates/buildUserInvitedEmailBody');
const buildUserInvitedNotRegisteredEmailBody = require('../../../utils/emailTemplates/buildUserInvitedNotRegisteredEmailBody');

const OK = require('../../../utils/responses/OK');

const getLogger = require('../../../utils/getLogger');

const logger = getLogger('[AccessModel] - ');

const handleUnexpectedError = (e) => {
  logger.error(e);
  throw new Error('We weren\'t able to share the project');
};

const createUserInvite = async (experimentId, invitedUserEmail, role, inviterUser) => {
  let userAttributes;
  let emailBody;

  try {
    userAttributes = await getAwsUserAttributesByEmail(invitedUserEmail);

    const invitedUserId = userAttributes.find((attr) => attr.Name === 'sub').Value;
    await new UserAccess().grantAccess(invitedUserId, experimentId, role);
    emailBody = buildUserInvitedEmailBody(invitedUserEmail, experimentId, inviterUser);
  } catch (e) {
    if (e.code !== 'UserNotFoundException') {
      handleUnexpectedError(e);
    }

    logger.log('Invited user does not have an account yet. Sending invitation email.');

    try {
      await new UserAccess().addToInviteAccess(invitedUserEmail, experimentId, role);
      emailBody = buildUserInvitedNotRegisteredEmailBody(invitedUserEmail, inviterUser);
    } catch (e2) {
      handleUnexpectedError(e2);
    }
  }

  try {
    await sendEmail(emailBody);
  } catch (e) {
    logger.log('Share notification send failure');
    throw new Error('The project was shared, but we weren’t able to notify the new collaborator');
  }

  return OK();
};

module.exports = createUserInvite;
