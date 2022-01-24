const { mean, round } = require('lodash');

module.exports = results => {
  Object.keys(results).forEach(taskType => {
    results[taskType].submitToActionDays = results[taskType].submitToActionDays.length > 0
      ? round(mean(results[taskType].submitToActionDays))
      : '-';

    results[taskType].assignToActionDays = results[taskType].assignToActionDays.length > 0
      ? round(mean(results[taskType].assignToActionDays))
      : '-';
  });

  return results;
};
