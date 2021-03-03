const AWS = require('../../utils/requireAWS');
const validateRequest = require('../../utils/schema-validator');

const pipelineResponse = async (io, message) => {
  await validateRequest(message, 'PipelineResponse.v1.yaml');

  // Fail hard if there was an error.
  const { response: { error } } = message;

  if (error) {
    throw new Error(error);
  }

  // Download output from S3.
  const s3 = new AWS.S3();
  const { output: { bucket, key } } = message;
  const outputObject = await s3.getObject(
    {
      Bucket: bucket,
      Key: key,
    },
  ).promise();
  const output = JSON.parse(outputObject.Body.toString());

  if (output.config) {
    await validateRequest(output.config, 'ProcessingConfigBodies.v1.yaml');
  }

  // Concatenate into a proper response.
  const response = {
    ...message,
    output,
  };


  const { input: { experimentId } } = message;
  console.log('Sending to all clients subscribed to experiment', experimentId);
  io.sockets.emit(`ExperimentUpdates-${experimentId}`, response);
};

module.exports = pipelineResponse;
