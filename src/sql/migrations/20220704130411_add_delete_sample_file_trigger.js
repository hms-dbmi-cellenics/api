const functionContent = (dbEnv) => {
  let body = '';

  if (['production', 'staging'].includes(dbEnv)) {
    const triggerLambdaARN = `arn:aws:lambda:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:function:delete-sample-file-lambda-${dbEnv}`;
    const invokeLambdaSql = `SELECT * from aws_lambda.invoke(aws_commons.create_lambda_function_arn(${triggerLambdaARN}, ${process.env.AWS_REGION}), $1)`;

    body = `
      var deleted_sample = {"body": {"s3_path": OLD.s3_path }};
      plv8.execute("${invokeLambdaSql}", [ deleted_sample ]);
    `;
  }

  return body;
};

const createDeleteSampleFileTriggerFunc = (env) => {
  const template = `
      CREATE EXTENSION IF NOT EXISTS plv8;
      CREATE EXTENSION IF NOT EXISTS aws_lambda;

      CREATE OR REPLACE FUNCTION public.delete_sample_file_on_sample_delete()
      RETURNS trigger
      LANGUAGE plv8
      AS $function$
        ${functionContent(env)}
        return OLD;
      $function$;

      CREATE TRIGGER delete_file_after_sample_file_delete
      AFTER DELETE ON sample_file
      FOR EACH ROW EXECUTE FUNCTION public.delete_sample_file_on_sample_delete();
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
};

exports.down = async (knex) => {
  const deleteDeleteSampleFileTriggerFunc = `
    DROP TRIGGER IF EXISTS delete_file_after_sample_file_delete ON sample_file;
    DROP FUNCTION IF EXISTS public.delete_sample_file_on_sample_delete;
    DROP EXTENSION IF EXISTS plv8;
    DROP EXTENSION IF EXISTS aws_lambda CASCADE;
  `;

  await knex.raw(deleteDeleteSampleFileTriggerFunc);
};
