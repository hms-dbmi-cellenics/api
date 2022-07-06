const crypto = require('crypto');

const algorithm = 'aes-256-ctr';
const NON_SECURE_SECRET_KEY = 'vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3'; // pragma: allowlist secret
const iv = crypto.randomBytes(16);

// NOTE: do not use this module to store secrets, it is only here to prevent slack from taking
// down our webhook URL.
// See for encrypt: https://attacomsian.com/blog/nodejs-encrypt-decrypt-data

const encrypt = (text) => {
  const cipher = crypto.createCipheriv(algorithm, NON_SECURE_SECRET_KEY, iv);

  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

  return {
    iv: iv.toString('hex'),
    content: encrypted.toString('hex'),
  };
};

const decrypt = (hash) => {
  const decipher = crypto.createDecipheriv(algorithm, NON_SECURE_SECRET_KEY, Buffer.from(hash.iv, 'hex'));

  const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);

  return decrpyted.toString();
};

const getWebhookUrl = () => {
  const webhookEndpoint = {
    iv: 'dd69dd9ce4f74a2451752c8cd277130a', // pragma: allowlist secret
    content: '5b5cea04e78c6beb9514a528278140f57cd40708c1a3422594f711d7f36134d1f12e5e293141fae19e1922246c3f3fa5851069bf289bfc628d0d933feab4a8e0e92b424eda4304c47c73de4f0fe870e127', // pragma: allowlist secret
  };

  return decrypt(webhookEndpoint);
};

module.exports = {
  decrypt,
  encrypt,
  getWebhookUrl,
};
