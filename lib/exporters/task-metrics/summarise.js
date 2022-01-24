module.exports = (summary, task) => {
  let {
    taskType,
    returnedCount,
    wasSubmitted,
    isOutstanding,
    submitToActionDiff,
    assignToActionDiff
  } = task.metrics;

  if (taskType === 'other') {
    return summary;
  }

  if (wasSubmitted) {
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
