const mockGetUserAccess = jest.fn();
const mockInviteUser = jest.fn();
const mockRevokeAccess = jest.fn();

module.exports = {
  getUserAccess: mockGetUserAccess,
  inviteUser: mockInviteUser,
  revokeAccess: mockRevokeAccess,
};
