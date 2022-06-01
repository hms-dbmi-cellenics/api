// @ts-nocheck
const _ = require('lodash');

const handleQCResponse = require('../../../../src/api.v2/helpers/pipeline/handleQCResponse');

const HookRunner = require('../../../../src/api.v2/helpers/pipeline/hooks/HookRunner');
const assignPodToPipeline = require('../../../../src/api.v2/helpers/pipeline/hooks/assignPodToPipeline');
const podCleanup = require('../../../../src/api.v2/helpers/pipeline/hooks/podCleanup');
const sendNotification = require('../../../../src/api.v2/helpers/pipeline/hooks/sendNotification');

// const validateRequest = require('../../../../src/utils/schema-validator');

jest.mock('aws-xray-sdk');

jest.mock('../../../../src/api.v2/helpers/pipeline/hooks/HookRunner');
jest.mock('../../../../src/api.v2/helpers/pipeline/hooks/assignPodToPipeline');
jest.mock('../../../../src/api.v2/helpers/pipeline/hooks/podCleanup');
jest.mock('../../../../src/api.v2/helpers/pipeline/hooks/sendNotification');

jest.mock('../../../../src/utils/schema-validator');

const hookRunnerInstance = HookRunner();

describe('handleQCResponse module', () => {
  describe('Registered hooks', () => {
    beforeEach(() => {
      assignPodToPipeline.mockClear();
      podCleanup.cleanupPods.mockClear();
      sendNotification.mockClear();
    });

    it('Hooks are registered', () => {
      expect(_.map(hookRunnerInstance.register.mock.calls, _.head)).toEqual(['assignPodToPipeline', 'configureEmbedding']);
    });

    it('assignPodToPipeline hook works correctly', () => {
      const assignPodToPipelineHooks = hookRunnerInstance.register.mock.calls[0][1];
      const mockedMessage = { mock: true };

      expect(assignPodToPipelineHooks).toHaveLength(1);

      assignPodToPipelineHooks[0](mockedMessage);

      expect(assignPodToPipeline).toHaveBeenCalledWith(mockedMessage);
    });

    it('configureEmbedding hook works correctly', () => {
      const configureEmbeddingHooks = hookRunnerInstance.register.mock.calls[1][1];
      const mockedMessage = { mock: true };

      configureEmbeddingHooks[0](mockedMessage);

      expect(podCleanup.cleanupPods).toHaveBeenCalledWith(mockedMessage);
    });

    it('registerAll hook works correctly', () => {
      const sendNotificationHooks = hookRunnerInstance.registerAll.mock.calls[0][0];
      const mockedMessage = { mock: true };

      sendNotificationHooks[0](mockedMessage);

      expect(sendNotification).toHaveBeenCalledWith(mockedMessage);
    });
  });

  describe('handleQCResponse main function', () => {
  });
});
