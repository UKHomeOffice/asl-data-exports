const Schema = require('@asl/schema');
const snakeCase = require('../../lib/utils/snake-case');

const settings = {
  database: process.env.DATABASE_NAME || 'asl-test',
  user: process.env.DATABASE_USERNAME || 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  password: process.env.DATABASE_PASSWORD || 'test-password'
};

module.exports = () => {

  return {
    init: (populate) => {
      const schema = Schema(settings);
      const tables = Object.keys(schema);
      return tables.reduce((p, table) => {
        return p.then(() => {
          if (schema[table].tableName) {
            return schema[table].knex().raw(`truncate ${snakeCase(schema[table].tableName)} cascade;`);
          }
        });
      }, Promise.resolve())
        .then(() => populate && populate(schema))
        .then(() => schema)
        .catch(err => {
          schema.destroy();
          throw err;
        });
    }
  };

};
