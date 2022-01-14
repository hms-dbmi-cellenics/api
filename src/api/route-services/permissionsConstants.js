
const MODULE_NAMES = {
  ALL: '*',
  DATA_MANAGEMENT: 'data-management',
  DATA_PROCESSING: 'data-processing',
  DATA_EXPLORATION: 'data-exploration',
  PLOTS_AND_TABLES: 'plots-and-tables',
};

const PERMISSIONS = {
  READ: 'r',
  READ_WRITE: 'rw',
};

const USER = {
  ANY: '*',
};
// const UUID_REGEX = '\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b';

module.exports = {
  PERMISSIONS, MODULE_NAMES, USER,
};
