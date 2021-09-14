type Context = {
    experimentId: string;
    projectId: string;
    processingConfig: {[key: string]: {} };
    accountId: string;
    roleArn: string;
    processName: string;
    activityArn: string;
    taskParams: {};
    clusterInfo: {
      name: string;
      certAuthority: string;
      endpoint: string;
    }
  }

// Holds information needed to build an actual pipeline step
// it contains information used to build the final Step
// with the runtime info such as the activity arn
type MetaStep = {
  XNextOnCatch: string;
  XStepType: string;
  XConstructorArgs: string;
  Next: string;
  End: boolean;
}

type Task = {
  processName: string;
}

type StepArgs = {
  taskName: string;
  perSample: boolean;
  uploadCountMatrix: boolean;
}

// Step defines a state machine step ready to be sent to aws
type Step = {
  Type: string;
  Next: string;
  Resource: string;
  Parameters: {
    FunctionName: string;
    ClusterName: string;
    CertificateAuthority: string;
    Endpoint: string;
    Method: string;
    Path: string;
    QueryParameters: {
      labelSelector: Array<string>;
      fieldSelector: Array<string>;
    }
    Payload: {
      image: string;
      name: string;
      detached: boolean;
      activityArn: string;
    }
  },
  Catch: Array<{
    ErrorEquals: Array<string>;
    ResultPath: string;
    Next: string;
  }>
}