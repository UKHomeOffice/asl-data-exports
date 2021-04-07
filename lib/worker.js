const { performance } = require('perf_hooks');
const db = require('@asl/schema');
const rops = require('./rops');

module.exports = settings => {
  const models = db(settings.db);

  const exporters = {
    rops: rops({ ...settings, models })
  };

  const { Export } = models;

  return () => {
    const start = performance.now();
    return Export.query()
      .where({ ready: false })
      .then(pending => {
        console.log(`Found ${pending.length} jobs`);
        return pending.reduce((promise, row) => {
          return promise
            .then(() => {
              if (exporters[row.type]) {
                return exporters[row.type](row)
                  .then(result => Export.query().findById(row.id).patch({ ready: true, meta: result }))
                  .catch(err => {
                    console.error(`Processing failed with error:\n${err.stack}`);
                  });
              }
              console.log(`Unrecognised type: ${row.type}`);
            });
        }, Promise.resolve());
      })
      .then(() => {
        const time = performance.now() - start;
        console.log(`Processing took: ${time}ms`);
      })
      .then(() => models);
  };
};
