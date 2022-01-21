const moment = require('moment-business-time');
const { bankHolidays } = require('@asl/constants');
moment.updateLocale('en', { holidays: bankHolidays });

module.exports = ({ summary, task, start, end }) => {
  let {
    taskType,
    firstSubmittedAt,
    returnedCount,
    isOutstanding,
    submitToActionDiff,
    assignToActionDiff
  } = task.metrics;

  if (taskType === 'other') {
    return summary;
  }

  start = start && moment(start);
  end = end && moment(end);
  firstSubmittedAt = firstSubmittedAt && moment(firstSubmittedAt);

  if (firstSubmittedAt && firstSubmittedAt.isAfter(start) && firstSubmittedAt.isBefore(end)) {
    summary[taskType].submitted++;
  }

  summary[taskType].returned += returnedCount;
  summary[taskType].outstanding += isOutstanding ? 1 : 0;

  if (submitToActionDiff) {
    summary[taskType].submitToActionDays.push(submitToActionDiff);
  }

  if (assignToActionDiff) {
    summary[taskType].assignToActionDays.push(assignToActionDiff);
  }

  return summary;
};
