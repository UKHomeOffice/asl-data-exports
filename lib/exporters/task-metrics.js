const csv = require('csv-stringify');
const archiver = require('archiver');
const Auth = require('../clients/auth');
const Metrics = require('../clients/metrics');

module.exports = settings => {
  const logger = settings.logger;
  const getAccessToken = Auth(settings.auth);
  const metrics = Metrics(settings.metrics);
  const s3 = settings.clients.s3;

  return async job => {
    logger.debug('fetching access token from keycloak');
    const accessToken = await getAccessToken();

    const internalDeadlinesCSV = csv({
      header: true,
      bom: true,
      columns: ['task_id', 'project_title', 'licence_number', 'type', 'resubmitted', 'extended', 'still_open', 'target', 'resolved_at']
    });

    const actionedTasksCSV = csv({
      header: true,
      bom: true,
      columns: ['taskType', 'submitted', 'returned', 'approved', 'rejected', 'outstanding', 'submitToActionDays', 'assignToActionDays']
    });

    const { start, end } = job.meta;
    const query = { start, end };

    logger.debug('fetching internal-deadlines report');
    const internalDeadlinesData = await metrics('/reports/internal-deadlines', { stream: false, query }, accessToken);
    logger.debug('writing internal-deadlines csv');
    internalDeadlinesData.filter(Boolean).forEach(row => internalDeadlinesCSV.write(row));
    internalDeadlinesCSV.end();

    logger.debug('fetching actioned-tasks report');
    const actionedTasksData = await metrics('/actioned-tasks', { stream: false, query }, accessToken);
    logger.debug('writing actioned-tasks csv');

    Object.keys(actionedTasksData).forEach(taskType => {
      actionedTasksCSV.write({ taskType, ...actionedTasksData[taskType] });
    });
    actionedTasksCSV.end();

    logger.debug('creating zip file');
    const zip = archiver('zip');

    zip.on('error', err => {
      throw new Error(err);
    });

    zip.append(internalDeadlinesCSV, { name: `internal-deadlines_${start}_${end}.csv` });
    zip.append(actionedTasksCSV, { name: `actioned-tasks_${start}_${end}.csv` });
    zip.finalize();

    logger.debug('uploading zip file');
    return s3({ key: job.id, stream: zip })
      .then(result => {
        logger.debug('upload success');
        return { ...job.meta, etag: result.ETag };
      })
      .catch(err => {
        throw new Error(err);
      });
  };
};
