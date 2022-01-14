const { performance } = require('perf_hooks');
const moment = require('moment');
const db = require('@asl/schema');
const rops = require('./rops');
const taskMetrics = require('./task-metrics');
const Logger = require('./utils/logger');

module.exports = settings => () => {
  const logger = Logger(settings);
  settings.logger = logger;

  const models = db(settings.db);
  settings.models = models;

  const exporters = {
    rops: rops(settings),
    'task-metrics': taskMetrics(settings)
  };

  const { Export } = models;

  const scheduleTaskMetrics = async () => {
    const prevMonth = moment().subtract(1, 'month');
    const start = moment(prevMonth).startOf('month').format('YYYY-MM-DD');
    const end = moment(prevMonth).endOf('month').format('YYYY-MM-DD');
    const type = 'task-metrics';
    const key = JSON.stringify({ start, end });

    logger.debug('checking for existing metrics report for previous month');
    const metricsForLastMonth = await Export.query().where({ type, key }).first();

    if (metricsForLastMonth) {
      logger.debug('existing report found, no need to schedule');
      return;
    }

    logger.debug('metrics report for previous month not found, scheduling export');
    return Export.query().insert({ type, key, meta: { start, end }, ready: false });
  };

  const processExports = () => {
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
      });
  };

  return scheduleTaskMetrics()
    .then(() => processExports())
    .then(() => models);
};
