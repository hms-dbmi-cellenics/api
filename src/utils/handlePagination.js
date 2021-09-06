const _ = require('lodash');
const mm = require('micromatch');
const logger = require('./logging').defaultLogger;

const handleTextFilter = (rows, filter) => {
  const { columnName, expression } = filter;

  // This is needed, because expression expects an SQL LIKE syntax,
  // and micromatch uses Bash glob syntax.
  const matcher = mm.matcher(expression.replace(/%/g, '*'), { nocase: true });

  // Filter those rows that (a) have the specific column and (b) match the
  // filtered expression.
  return rows.filter((row) => row[columnName] && matcher(row[columnName]));
};

const handleNumericFilter = () => {
  throw new Error('Not yet implemented.');
};

const handlePagination = (results, pagination) => {
  const {
    orderBy, orderDirection, offset, limit, responseKey, filters,
  } = pagination;

  const body = JSON.parse(results[responseKey].body);
  let { rows } = body;

  if (filters) {
    logger.log('Filters applied, processing those first...');

    filters.forEach((filter) => {
      const { type } = filter;

      if (type === 'text') {
        logger.log('Found a text-based filter', filter, 'applying...');
        rows = handleTextFilter(rows, filter);
      } else if (type === 'numeric') {
        logger.log('Found a numeric-based filter', filter, 'applying...');
        rows = handleNumericFilter(rows, filter);
      }
    });
  }

  const total = rows.length;

  rows = _.orderBy(rows, [orderBy], [orderDirection.toLowerCase()]);
  rows = rows.slice(offset, offset + limit);

  // eslint-disable-next-line no-param-reassign
  results[responseKey].body = JSON.stringify({ ...body, rows, total });

  return results;
};

module.exports = { handlePagination };
