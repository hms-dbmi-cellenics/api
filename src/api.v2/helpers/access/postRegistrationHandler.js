const crypto = require('crypto');

const ENC_METHOD = 'aes-256-cbc';

const getLogger = require('../../../utils/getLogger');
const { OK, BadRequestError } = require('../../../utils/responses');

const UserAccess = require('../../model/UserAccess');

const logger = getLogger('[PostRegistrationHandler] - ');
const config = require('../../../config');

const decrypt = (encryptedData, key, iv) => {
  const buff = Buffer.from(encryptedData, 'base64');
  const decipher = crypto.createDecipheriv(ENC_METHOD, key, iv);
  return (
    decipher.update(buff.toString('utf8'), 'hex', 'utf8')
      + decipher.final('utf8')
  );
};

const postRegistrationHandler = async (req) => {
  const key = crypto.createHash('sha512').update(config.domainName)
    .digest('hex')
    .substring(0, 32);

  const [encryptedData, iv] = req.body.split('.');
  let payload = '';

  try {
    // An invalid request will not be parsed into JSON correctly
    payload = decrypt(encryptedData, key, iv);
  } catch (e) {
    throw new BadRequestError('Invalid request');
  }

  const { userEmail, userId } = JSON.parse(payload);

  new UserAccess().registerNewUserAccess(userEmail, userId);

  logger.log(`Post registration handled for user ${userId}`);

  return OK();
};

module.exports = postRegistrationHandler;
