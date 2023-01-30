const roles = require('../../../src/api.v2/helpers/roles');
const fake = require('../../test-utils/constants');


describe('tests for the roles logic', () => {
  test(' isRoleAuthorized authorizes all roles to GET', async () => {
    roles.ROLE_NAMES.forEach((role) => {
      const isAuthorized = roles.isRoleAuthorized(role, '*', 'GET');
      expect(isAuthorized).toEqual(true);
    });
  });

  test(' isRoleAuthorized rejects invalid roles', async () => {
    ['', '*', undefined, null].forEach((role) => {
      const isAuthorized = roles.isRoleAuthorized(role, '*', 'GET');
      expect(isAuthorized).toEqual(false);
    });
  });

  test(' isRoleAuthorized rejects viewer to make changes', async () => {
    ['*', 'socket', '/experiments'].forEach((resource) => {
      ['POST', 'PUT', 'PATCH', 'DELETE'].forEach((method) => {
        const isAuthorized = roles.isRoleAuthorized(roles.VIEWER, resource, method);
        expect(isAuthorized).toEqual(false);
      });
    });
  });

  test(' isRoleAuthorized rejects explorer to run the pipeline', async () => {
    [
      `/experiments/${fake.EXPERIMENT_ID}/gem2s`,
      `/experiments/${fake.EXPERIMENT_ID}/pipelines`,
    ].forEach((resource) => {
      const isAuthorized = roles.isRoleAuthorized(roles.EXPLORER, resource, 'POST');
      expect(isAuthorized).toEqual(false);
    });
  });

  test(' isRoleAuthorized authorized explorer to run subset pipeline', async () => {
    const isAuthorized = roles.isRoleAuthorized(roles.EXPLORER, `/experiments/${fake.EXPERIMENT_ID}/subset`, 'POST');
    expect(isAuthorized).toEqual(true);
  });

  test(' isRoleAuthorized authorizes admin & owner roles to everything', async () => {
    [roles.OWNER, roles.ADMIN].forEach((role) => {
      ['*', 'socket', '/experiments'].forEach((resource) => {
        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].forEach((method) => {
          const isAuthorized = roles.isRoleAuthorized(role, resource, method);
          expect(isAuthorized).toEqual(true);
        });
      });
    });
  });
});
