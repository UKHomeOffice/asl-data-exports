const aslSchema = require('../../asl-schema');
const snakeCase = require('../../lib/utils/snake-case');

const settings = {
  database: process.env.DATABASE_NAME || 'asl-test',
  user: process.env.DATABASE_USERNAME || 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  password: process.env.DATABASE_PASSWORD || 'test-password'
};

module.exports = () => ({
  init: async (populate) => {
    let schema; let tables = null;
    try {
      schema = await aslSchema(settings); // Await schema initialization
      tables = Object.keys(schema);

      // Use a for...of loop for better async flow handling
      for (const table of tables) {
        if (schema[table].tableName) {
          await schema[table].knex().raw(`truncate ${snakeCase(schema[table].tableName)} cascade;`);
        }
      }

      // Populate if a function is provided
      if (populate) {
        await populate(schema);
      }

      return schema;
    } catch (err) {
      if (schema) {
        schema.destroy(); // Ensure schema is destroyed on error
      }
      throw err;
    }
  }
});
