module.exports = (summary, task) => {
  if (!task.metrics) {
    return summary;
  }

  let {
    taskType,
    returnedCount,
    wasSubmitted,
    isOutstanding,
    submitToActionDiff,
    assignToActionDiff,
    resolvedAt
  } = task.metrics;

  if (!taskType || taskType === 'other') {
    return summary;
  }

  if (wasSubmitted) {
    summary[taskType].submitted++;
  }

  if (resolvedAt) {
    if (task.status === 'resolved') {
      summary[taskType].approved++;
    }
    if (task.status === 'rejected') {
      summary[taskType].rejected++;
    }
  }

  summary[taskType].returned += (returnedCount || 0);
  summary[taskType].outstanding += isOutstanding ? 1 : 0;

  if (typeof submitToActionDiff !== 'undefined') {
    summary[taskType].submitToActionDays.push(submitToActionDiff);
  }

  if (typeof assignToActionDiff !== 'undefined') {
    summary[taskType].assignToActionDays.push(assignToActionDiff);
  }

  return summary;
};
