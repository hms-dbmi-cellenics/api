const UserAccess = require('../../model/UserAccess');

const postRegistrationHandler = async (userEmail, userId) => {
  new UserAccess().registerNewUserAccess(userEmail, userId);
};

module.exports = postRegistrationHandler;
