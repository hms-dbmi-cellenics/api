type Context = {
    experimentId: string;
    accountId: string;
    roleArn: string;
    processName: string;
    activityArn: string;
  }

// Holds information needed to build an actual pipeline step
type MetaStep = {
  XNextOnCatch: string;
  XStepType: string;
  XConstructorArgs: string;
  Next: string;
}

// State machine step ready to be sent to aws
type Step = {
  Type: string;
  Next: string;
  Resource: string;
  Parameters: {
    FunctionName: string;
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