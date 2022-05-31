const UserAccess = require('../../model/UserAccess');

const { getAwsUserAttributesByEmail } = require('../../../utils/aws/user');
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
    userAttributes = await getAwsUserAttributesByEmail(invitedUserEmail);

    const invitedUserId = userAttributes.find((attr) => attr.Name === 'sub').Value;
    new UserAccess().grantAccess(invitedUserId, experimentId, role);
    emailBody = buildUserInvitedEmailBody(invitedUserEmail, experimentId, inviterUser);
  } catch (e) {
    if (e.code !== 'UserNotFoundException') {
      throw e;
    }

    logger.log('Invited user does not have an account yet. Sending invitation email.');

    new UserAccess().addToInviteAccess(invitedUserEmail, experimentId, role);
    emailBody = buildUserInvitedNotRegisteredEmailBody(invitedUserEmail, inviterUser);
  }

  await sendEmail(emailBody);

  return OK();
};

module.exports = createUserInvite;
