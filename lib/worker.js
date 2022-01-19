const { performance } = require('perf_hooks');
const db = require('@asl/schema');
const rops = require('./exporters/rops');
const taskMetrics = require('./exporters/task-metrics');
const Logger = require('./utils/logger');
const S3 = require('./clients/s-three');

module.exports = settings => {
  const logger = Logger(settings);
  settings.logger = logger;

  settings.models = db(settings.db);

  settings.s3Upload = S3(settings.s3);

  const exporters = {
    rops: rops(settings),
    'task-metrics': taskMetrics(settings)
  };

  const { Export } = settings.models;

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
      .then(() => settings.models);
  };

};
