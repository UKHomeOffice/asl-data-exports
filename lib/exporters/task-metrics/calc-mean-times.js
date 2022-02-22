const { mean, round } = require('lodash');

const median = arr => {
  const sorted = arr.sort((a, b) => a < b ? -1 : 1);
  const index = (arr.length - 1) / 2;

  return arr.length % 2
    ? sorted[index]
    : round(mean([sorted[Math.floor(index)], sorted[Math.ceil(index)]]));
};

module.exports = results => {
  const output = {};
  const props = ['submitToActionDays', 'assignToActionDays', 'resubmitToActionDays'];

  Object.keys(results).forEach(taskType => {

    output[taskType] = output[taskType] || {};

    props.forEach(prop => {
      output[taskType][`${prop}Mean`] = results[taskType][prop].length > 0
        ? round(mean(results[taskType][prop]))
        : '-';
      output[taskType][`${prop}Median`] = results[taskType][prop].length > 0
        ? median(results[taskType][prop])
        : '-';
    });

  });

  return output;
};
