const AWS = require('aws-sdk');
const crypto = require('crypto');
const fetch = require('node-fetch');
const YAML = require('yaml');
const jq = require('jq-web');
const config = require('../../config');


class PipelinesService {
  constructor() {
    this.stepFunctions = new AWS.StepFunctions({
      region: config.awsRegion,
    });

    this.clusterInfo = null;
  }

  async getClusterInformation() {
    if (!this.clusterInfo) {
      const eks = new AWS.EKS({
        region: config.awsRegion,
      });

      const accountId = await config.awsAccountIdPromise();
      const info = await eks.describeCluster({ name: `biomage-${config.clusterEnv}` }).promise();

      const { name, endpoint } = info.cluster;
      const certAuthority = info.cluster.certificateAuthority.data;
      const roleArn = `arn:aws:iam::${accountId}:role/state-machine-role-${config.clusterEnv}`;

      this.clusterInfo = {
        accountId, name, endpoint, certAuthority, roleArn,
      };
    }

    return this.clusterInfo;
  }

  static async getPipelineImage() {
    const response = await fetch(
      config.pipelineInstanceConfigUrl,
      {
        method: 'GET',
      },
    );

    const txt = await response.text();
    const manifest = YAML.parseAllDocuments(txt);

    return jq.json(manifest, '..|objects|.r//empty');
  }

  async generatePipeline(experimentId) {
    const { name, endpoint, certAuthority } = await this.getClusterInformation();
    const namespace = `worker-${config.sandboxId}`;
    const image = await PipelinesService.getPipelineImage();

    return {
      Comment: 'N/A',
      StartAt: 'DeleteCompletedJobs',
      States: {
        DeleteCompletedJobs: {
          Type: 'Task',
          Comment: 'Deletes all the preivous server jobs that are already completed.',
          Resource: 'arn:aws:states:::eks:call',
          Parameters: {
            ClusterName: name,
            CertificateAuthority: certAuthority,
            Endpoint: endpoint,
            Method: 'DELETE',
            Path: `/apis/batch/v1/namespaces/${namespace}/jobs`,
            QueryParameters: {
              fieldSelector: [
                'status.successful=1',
              ],
            },
          },
          Next: 'LaunchKubernetesJobIfNotExists',
        },
        LaunchKubernetesJobIfNotExists: {
          Type: 'Task',
          Comment: 'Attempts to create a Kubernetes Job for the pipeline server. Will swallow a 409 (already exists) error.',
          Resource: 'arn:aws:states:::eks:call',
          Parameters: {
            ClusterName: name,
            CertificateAuthority: certAuthority,
            Endpoint: endpoint,
            Method: 'POST',
            Path: `/apis/batch/v1/namespaces/${namespace}/jobs`,
            RequestBody: {
              apiVersion: 'batch/v1',
              kind: 'Job',
              metadata: {
                name: `remoter-server-${experimentId}`,
              },
              spec: {
                template: {
                  metadata: {
                    name: `remoter-server-${experimentId}`,
                  },
                  spec: {
                    containers: [
                      {
                        name: 'remoter-server',
                        image,
                      },
                    ],
                    restartPolicy: 'Never',
                  },
                },
              },
            },
          },
          Retry: [
            {
              ErrorEquals: ['EKS.409'],
              IntervalSeconds: 1,
              BackoffRate: 2.0,
              MaxAttempts: 2,
            },
          ],
          Catch: [
            {
              ErrorEquals: ['EKS.409'],
              ResultPath: '$.error-info',
              Next: 'Wait',
            },
          ],
          Next: 'Wait',
        },
        Wait: {
          Type: 'Wait',
          Seconds: 5,
          End: true,
        },
      },
    };
  }


  async create(experimentId) {
    const {
      roleArn, accountId,
    } = await this.getClusterInformation();

    const { clusterEnv, sandboxId } = config;

    const pipelineHash = crypto
      .createHash('sha1')
      .update(`${experimentId}-${sandboxId}`)
      .digest('hex');

    const params = {
      name: `biomage-pipeline-${pipelineHash}`,
      roleArn,
      definition: JSON.stringify(await this.generatePipeline(experimentId)),
      loggingConfiguration: {
        level: 'OFF',
      },
      tags: [
        {
          key: 'experimentId',
          value: experimentId,
        },
        {
          key: 'clusterEnv',
          value: clusterEnv,
        },
        {
          key: 'sandboxId',
          value: sandboxId,
        },
      ],
      type: 'STANDARD',
    };

    console.log(params);
    try {
      const { stateMachineArn } = await this.stepFunctions.createStateMachine(params).promise();
      return { stateMachineArn };
    } catch (e) {
      console.log('other error!');


      if (e.code !== 'StateMachineAlreadyExists') {
        console.log('throw!@!');
        throw e;
      }

      console.log('try again');

      const stateMachineArn = `arn:aws:states:${config.awsRegion}:${accountId}:stateMachine:${params.name}`;

      await this.stepFunctions.updateStateMachine(
        { stateMachineArn, definition: params.definition, roleArn },
      ).promise();

      return { stateMachineArn };
    }
  }
}

module.exports = PipelinesService;
