const getUser = jest.fn((email) => ({
  UserAttributes: [
    { Name: 'name', Value: `${email}-test` },
    { Name: 'email', Value: `${email}@example.com` },
  ],
}));

module.exports = getUser;
