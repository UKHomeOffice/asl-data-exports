const rops = require('./rops');
const taskMetrics = require('./task-metrics');

module.exports = settings => {
  return {
    rops: rops(settings),
    'task-metrics': taskMetrics(settings)
  };
};
