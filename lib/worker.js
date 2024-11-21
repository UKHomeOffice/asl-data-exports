const { performance } = require('perf_hooks');
const Exporters = require('./exporters');
const Logger = require('./utils/logger');
const s3Upload = require('./clients/s3-upload');
const aslSchema = require('../asl-schema');

// Asynchronously initialize the schema
async function initializeSchema(settings) {
  try {
    return await aslSchema(settings.db); // Await the schema initialization
  } catch (error) {
    console.error('Failed to initialize schema:', error);
    throw error;
  }
}

module.exports = async (settings) => {
  // Initialize logger and models asynchronously
  const logger = Logger(settings);
  settings.logger = logger;

  // Ensure the models are initialized before proceeding
  settings.models = await initializeSchema(settings);

  settings.s3Upload = s3Upload(settings.s3);

  const exporters = Exporters(settings);

  const { Export } = settings.models;

  // Return a function to process pending export jobs
  return () => {
    const start = performance.now();
    return Export.query()
      .where({ ready: false })
      .then(pending => {
        logger.info(`Found ${pending.length} jobs`);
        return pending.reduce((promise, row) => {
          return promise
            .then(() => {
              if (exporters[row.type]) {
                return exporters[row.type](row)
                  .then(result => Export.query().findById(row.id).patch({ ready: true, meta: result }))
                  .catch(err => {
                    logger.error(`Processing failed with error:\n${err.stack}`);
                  });
              }
              logger.warn(`Unrecognised type: ${row.type}`);
            });
        }, Promise.resolve());
      })
      .then(() => {
        const time = performance.now() - start;
        logger.info(`Processing took: ${time}ms`);
      })
      .then(() => settings.models); // Ensure models are ready before finishing
  };
};
