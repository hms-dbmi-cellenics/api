// The basic functions of a model that uses Knexjs to store and retrieve data from a
// database using the provided `knex` instance. Custom functionality can be
// composed on top of this set of common functions.
//
// The idea is that these are the most-used types of functions that most/all
// "models" will want to have.

class BasicModel {
  constructor(sql, tableName, selectableProps = [], timeout = 4000) {
    this.sql = sql;
    this.tableName = tableName;
    this.selectableProps = selectableProps;
    this.timeout = timeout;
  }

  create(props) {
    return this.sql.insert(props)
      .returning(this.selectableProps)
      .into(this.tableName)
      .timeout(this.timeout);
  }

  findAll() {
    return this.sql
      .select(this.selectableProps)
      .from(this.tableName)
      .timeout(this.timeout);
  }

  find(filters) {
    return this.sql.select(this.selectableProps)
      .from(this.tableName)
      .where(filters)
      .timeout(this.timeout);
  }

  // Same as `find` but only returns the first match if >1 are found.
  findOne(filters) {
    return this.find(filters)
      // @ts-ignore
      .then((results) => {
        if (!Array.isArray(results)) return results;

        return results[0];
      });
  }

  findById(id) {
    return this.sql.select(this.selectableProps)
      .from(this.tableName)
      .where({ id })
      .timeout(this.timeout);
  }

  updateById(id, props) {
    return this.sql.update(props)
      .from(this.tableName)
      .where({ id })
      .returning(this.selectableProps)
      .timeout(this.timeout);
  }

  update(filter, props) {
    return this.sql.update(props)
      .from(this.tableName)
      .where(filter)
      .returning(this.selectableProps)
      .timeout(this.timeout);
  }

  deleteById(id) {
    return this.sql.del()
      .from(this.tableName)
      .where({ id })
      .returning(this.selectableProps)
      .timeout(this.timeout);
  }

  delete(filters) {
    return this.sql.del()
      .from(this.tableName)
      .where(filters)
      .returning(this.selectableProps)
      .timeout(this.timeout);
  }
}

module.exports = BasicModel;
