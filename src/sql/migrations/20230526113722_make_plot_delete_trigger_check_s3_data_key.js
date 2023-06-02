const createTriggerDeleteLambda = (dbEnv, key, bucketName) => {
  const triggerLambdaARN = `arn:aws:lambda:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:function:delete-s3-file-lambda-${dbEnv}`;

  // Removing the environment and account id from the bucket name.
  // When making a migration, the environment would be development,
  // due to the fact that the migration is ran locally,
  // so we need to add the environment and accountID in the lambda itself
  // const rawBucketName = bucketName.split('-').slice(0, -2).join('-');
  const rawBucketName = bucketName.split('-').slice(0, -2).join('-');

  const callDeleteLambda = `PERFORM aws_lambda.invoke('${triggerLambdaARN}', json_build_object('key',OLD.${key}, 'bucketName', '${rawBucketName}'), '${process.env.AWS_REGION}', 'Event');`;

  return callDeleteLambda;
};

const deleteFromS3IfNoOtherPlotReferencesS3Data = (dbEnv, key, bucketName) => {
  // We can't run lambdas in localstack free so only run if staging or prod
  if (['production', 'staging'].includes(dbEnv)) {
    const callDeleteLambda = createTriggerDeleteLambda(dbEnv, key, bucketName);

    return `
      IF NOT EXISTS (
        SELECT FROM plot 
        WHERE plot.s3_data_key = OLD.s3_data_key
      ) THEN ${callDeleteLambda}
      END IF;
    `;
  }

  return '';
};

const deleteFromS3 = (dbEnv, key, bucketName) => {
  // We can't run lambdas in localstack free so only run if staging or prod
  if (['production', 'staging'].includes(dbEnv)) {
    return createTriggerDeleteLambda(dbEnv, key, bucketName);
  }

  return '';
};

const createOnDeletePlotTriggerFunc = (body) => {
  const template = `
      CREATE OR REPLACE FUNCTION public.delete_file_from_s3_after_plot_delete()
        RETURNS trigger
        LANGUAGE plpgsql
      AS $function$
      BEGIN
        ${body}
        return OLD;
      END;
      $function$;

      DROP TRIGGER IF EXISTS delete_file_from_s3_after_plot_delete_trigger on plot;
      CREATE TRIGGER delete_file_from_s3_after_plot_delete_trigger
      AFTER DELETE ON plot
      FOR EACH ROW EXECUTE FUNCTION public.delete_file_from_s3_after_plot_delete();
    `;

  return template;
};

exports.up = async (knex) => {
  if (!process.env.AWS_REGION) {
    throw new Error('Environment variables AWS_REGION and AWS_ACCOUNT_ID are required');
  }

  if (!process.env.AWS_ACCOUNT_ID) {
    throw new Error('Environment variables AWS_REGION and AWS_ACCOUNT_ID are required');
  }

  const plotBucketName = `plots-tables-${process.env.NODE_ENV}-${process.env.AWS_ACCOUNT_ID}`;
  const body = deleteFromS3IfNoOtherPlotReferencesS3Data(process.env.NODE_ENV, 's3_data_key', plotBucketName);

  await knex.raw(createOnDeletePlotTriggerFunc(body));
};

exports.down = async (knex) => {
  if (!process.env.AWS_REGION) {
    throw new Error('Environment variables AWS_REGION and AWS_ACCOUNT_ID are required');
  }

  if (!process.env.AWS_ACCOUNT_ID) {
    throw new Error('Environment variables AWS_REGION and AWS_ACCOUNT_ID are required');
  }

  const plotBucketName = `plots-tables-${process.env.NODE_ENV}-${process.env.AWS_ACCOUNT_ID}`;
  const body = deleteFromS3(process.env.NODE_ENV, 's3_data_key', plotBucketName);

  await knex.raw(createOnDeletePlotTriggerFunc(body));
};
