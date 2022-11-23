const getUser = jest.fn((email) => (
  [
    { Name: 'name', Value: `${email}-test` },
    { Name: 'email', Value: `${email}@example.com` },
  ]
));

module.exports = getUser;
