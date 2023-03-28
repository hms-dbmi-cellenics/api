const { PLOTS } = require('../../config/bucketNames');

const getTriggerFunction = (dbEnv, key, bucketName) => {
  let body = '';
  const triggerLambdaARN = `arn:aws:lambda:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:function:delete-s3-file-lambda-${dbEnv}`;

  // Removing the environment and account id from the bucket name.
  // When making a migration, the environment would be development,
  // due to the fact that the migration is ran locally,
  // so we need to add the environment and accountID in the lambda itself
  const rawBucketName = bucketName.split('-').slice(0, -2).join('-');

  // We skip creation of the triggers and functions in development
  // because it requires aws_commons and aws_lambda modules which are proprietary.
  if (['production', 'staging'].includes(dbEnv)) {
    body = `PERFORM aws_lambda.invoke('${triggerLambdaARN}', json_build_object('key',OLD.${key}, 'bucketName', '${rawBucketName}'), '${process.env.AWS_REGION}', 'Event');`;
  }

  return body;
};

const createDeletePlotTriggerNewFunc = (env) => {
  const body = getTriggerFunction(env, 's3_data_key', PLOTS);

  const template = `
      CREATE OR REPLACE FUNCTION public.delete_file_from_s3_after_plot_delete()
        RETURNS trigger
        LANGUAGE plpgsql
      AS $function$
      BEGIN
        IF OLD.s3_data_key IS NOT NULL THEN 
          ${body}
        END IF;
        return OLD;
      END;
      $function$;

      CREATE TRIGGER delete_file_from_s3_after_plot_delete_trigger
      AFTER DELETE ON plot
      FOR EACH ROW EXECUTE FUNCTION public.delete_file_from_s3_after_plot_delete();
    `;

  return template;
};

const createDeletePlotTriggerOldFunc = (env) => {
  const body = getTriggerFunction(env, 's3_data_key', PLOTS);

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

  await knex.raw(`
    DROP TRIGGER IF EXISTS delete_file_from_s3_after_plot_delete_trigger ON plot;
    DROP FUNCTION IF EXISTS public.delete_file_from_s3_after_plot_delete;
  `);

  await knex.raw(createDeletePlotTriggerNewFunc(process.env.NODE_ENV));
};

exports.down = async (knex) => {
  await knex.raw(`
    DROP TRIGGER IF EXISTS delete_file_from_s3_after_plot_delete_trigger ON plot;
    DROP FUNCTION IF EXISTS public.delete_file_from_s3_after_plot_delete;
  `);

  await knex.raw(createDeletePlotTriggerOldFunc(process.env.NODE_ENV));
};
