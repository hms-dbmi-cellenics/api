// Updates each sub attribute separately for
// one particular attribute (of type object) of a dynamodb entry

const { NotFoundError } = require('./responses');

const undefinedIfNotFound = async (promise) => {
  try {
    return await promise;
  } catch (e) {
    if (e instanceof NotFoundError) {
      return undefined;
    }

    throw e;
  }
};

module.exports = { undefinedIfNotFound };
