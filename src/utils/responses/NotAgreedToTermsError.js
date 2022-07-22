class NotAgreedToTermsError extends Error {
  constructor(message) {
    super(message);
    this.status = 424;
  }
}

module.exports = NotAgreedToTermsError;
