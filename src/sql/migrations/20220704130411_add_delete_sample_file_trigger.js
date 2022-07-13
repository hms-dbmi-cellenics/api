const getTemplateValues = (dbEnv) => {
  let body = '';
  let header = '';

  // We skip creation of this trigger and function in development
  // because it requires aws_commons and aws_lambda modules which are proprietary.
  if (['production', 'staging'].includes(dbEnv)) {
    header = `
      CREATE EXTENSION IF NOT EXISTS aws_commons;
      CREATE EXTENSION IF NOT EXISTS aws_lambda;
    `;

    const triggerLambdaARN = `arn:aws:lambda:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:function:delete-sample-file-lambda-${dbEnv}`;
    body = `PERFORM aws_lambda.invoke('${triggerLambdaARN}', row_to_json(OLD), '${process.env.AWS_REGION}', 'Event');`;
  }

  return { body, header };
};

const createDeleteSampleFileTriggerFunc = (env) => {
  const { header, body } = getTemplateValues(env);

  const template = `
      ${header}

      CREATE OR REPLACE FUNCTION public.delete_file_from_s3_after_sample_file_delete()
        RETURNS trigger
        LANGUAGE plpgsql
      AS $function$
      BEGIN
        ${body}
        return OLD;
      END;
      $function$;

      CREATE TRIGGER delete_file_from_s3_after_sample_file_delete_trigger
      AFTER DELETE ON sample_file
      FOR EACH ROW EXECUTE FUNCTION public.delete_file_from_s3_after_sample_file_delete();
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

  await knex.raw(createDeleteSampleFileTriggerFunc(process.env.NODE_ENV));

  await knex.raw(`
    GRANT USAGE ON SCHEMA aws_lambda TO api_role;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA aws_lambda TO api_role;
  `);
};

exports.down = async (knex) => {
  await knex.raw(`
    DROP TRIGGER IF EXISTS delete_file_from_s3_after_sample_file_delete_trigger ON sample_file;
    DROP FUNCTION IF EXISTS public.delete_file_from_s3_after_sample_file_delete;
    DROP EXTENSION IF EXISTS aws_lambda CASCADE;
    DROP EXTENSION IF EXISTS aws_commons CASCADE;
  `);
};
