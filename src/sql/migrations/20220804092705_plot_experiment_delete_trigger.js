import {
  PLOTS, SAMPLE_FILES, FILTERED_CELLS, RAW_SEURAT, PROCESSED_MATRIX,
} from '../../api.v2/helpers/s3/bucketNames';

const getGenericLambda = (env) => {
  const triggerLambdaARN = `arn:aws:lambda:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:function:delete-s3-file-lambda-${env}`;
  return triggerLambdaARN;
};

const getTemplateValue = (dbEnv, key, bucketName) => {
  let body = '';

  // We skip creation of the triggers and functions in development
  // because it requires aws_commons and aws_lambda modules which are proprietary.
  if (['production', 'staging'].includes(dbEnv)) {
    const lambdaArn = getGenericLambda(dbEnv);
    body = `PERFORM aws_lambda.invoke('${lambdaArn}', json_build_object('key',${key}, 'bucketName', ${bucketName}), '${process.env.AWS_REGION}', 'Event');`;
  }

  return body;
};

const createDeletePlotTriggerFunc = async (env) => {
  const body = getTemplateValue(env, 'experiment_id', PLOTS);

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

const deleteSampleTrigger = () => {
  // the lambda for deleting s3 is being generalised
  const query = `
    DROP TRIGGER IF EXISTS delete_file_from_s3_after_sample_file_delete_trigger ON sample_file;
    DROP FUNCTION IF EXISTS public.delete_file_from_s3_after_sample_file_delete;
  `;
  return query;
};

const createDeleteSampleFileTriggerFunc = async (env) => {
  const body = getTemplateValue(env, 's3_path', SAMPLE_FILES);

  const template = `
      CREATE OR REPLACE FUNCTION public.delete_file_from_s3_after_sample_delete()
        RETURNS trigger
        LANGUAGE plpgsql
      AS $function$
      BEGIN
        ${body}
        return OLD;
      END;
      $function$;

      CREATE TRIGGER delete_file_from_s3_after_sample_delete_trigger
      AFTER DELETE ON sample_file
      FOR EACH ROW EXECUTE FUNCTION public.delete_file_from_s3_after_sample_delete();
    `;

  return template;
};

const createDeleteFilteredCellsTriggerFunc = async (env) => {
  const body = getTemplateValue(env, 'id', FILTERED_CELLS);

  const template = `
      CREATE OR REPLACE FUNCTION public.delete_filtered_cells_from_s3_after_experiment_delete()
        RETURNS trigger
        LANGUAGE plpgsql
      AS $function$
      BEGIN
        ${body}
        return OLD;
      END;
      $function$;

      CREATE TRIGGER delete_filtered_cells_from_s3_after_experiment_delete_trigger
      AFTER DELETE ON experiment
      FOR EACH ROW EXECUTE FUNCTION public.delete_filtered_cells_from_s3_after_experiment_delete();
    `;
  return template;
};

const createDeleteRawSeuratTriggerFunc = async (env) => {
  const body = getTemplateValue(env, 'id', RAW_SEURAT);

  const template = `
      CREATE OR REPLACE FUNCTION public.delete_raw_seurat_from_s3_after_experiment_delete()
        RETURNS trigger
        LANGUAGE plpgsql
      AS $function$
      BEGIN
        ${body}
        return OLD;
      END;
      $function$;

      CREATE TRIGGER delete_raw_seurat_from_s3_after_experiment_delete_trigger
      AFTER DELETE ON experiment
      FOR EACH ROW EXECUTE FUNCTION public.delete_raw_seurat_from_s3_after_experiment_delete();
    `;
  return template;
};

const createDeleteProcessedMatrixTriggerFunc = async (env) => {
  const body = getTemplateValue(env, 'id', PROCESSED_MATRIX);
  const template = `
      CREATE OR REPLACE FUNCTION public.delete_processed_matrix_from_s3_after_experiment_delete()
        RETURNS trigger
        LANGUAGE plpgsql
      AS $function$
      BEGIN
        ${body}
        return OLD;
      END;
      $function$;

      CREATE TRIGGER delete_processed_matrix_from_s3_after_experiment_delete_trigger
      AFTER DELETE ON experiment
      FOR EACH ROW EXECUTE FUNCTION public.delete_processed_matrix_from_s3_after_experiment_delete();
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

  await knex.raw(deleteSampleTrigger());
  await knex.raw(createDeletePlotTriggerFunc(process.env.NODE_ENV));
  await knex.raw(createDeleteSampleFileTriggerFunc(process.env.NODE_ENV));
  await knex.raw(createDeleteFilteredCellsTriggerFunc(process.env.NODE_ENV));
  await knex.raw(createDeleteRawSeuratTriggerFunc(process.env.NODE_ENV));
  await knex.raw(createDeleteProcessedMatrixTriggerFunc(process.env.NODE_ENV));
};

exports.down = async (knex) => {
  await knex.raw(`
    DROP TRIGGER IF EXISTS delete_file_from_s3_after_plot_delete_trigger ON plot;
    DROP FUNCTION IF EXISTS public.delete_file_from_s3_after_plot_delete;
    DROP TRIGGER IF EXISTS delete_file_from_s3_after_sample_delete_trigger ON sample_file;
    DROP FUNCTION IF EXISTS public.delete_file_from_s3_after_sample_delete;
    DROP TRIGGER IF EXISTS delete_filtered_cells_from_s3_after_experiment_delete_trigger ON experiment;
    DROP FUNCTION IF EXISTS public.delete_filtered_cells_from_s3_after_experiment_delete;
    DROP TRIGGER IF EXISTS delete_raw_seurat_from_s3_after_experiment_delete_trigger ON experiment;
    DROP FUNCTION IF EXISTS public.delete_raw_seurat_from_s3_after_experiment_delete;
    DROP TRIGGER IF EXISTS delete_processed_matrix_from_s3_after_experiment_delete_trigger ON experiment;
    DROP FUNCTION IF EXISTS public.delete_processed_matrix_from_s3_after_experiment_delete;
  `);
};
