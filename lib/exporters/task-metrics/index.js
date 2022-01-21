const csv = require('csv-stringify');
const archiver = require('archiver');
const Auth = require('../../clients/auth');
const Metrics = require('../../clients/metrics');
const emptyStats = require('./empty-stats');
const summarise = require('./summarise');
const calcMeanTimes = require('./calc-mean-times');

module.exports = settings => {
  const logger = settings.logger;
  const getAccessToken = Auth(settings.auth);
  const metrics = Metrics(settings.metrics);
  const s3Upload = settings.s3Upload;

  return async job => {
    logger.debug('fetching access token from keycloak');
    const accessToken = await getAccessToken();

    const { start, end } = job.meta;
    const query = { start, end };

    const internalDeadlinesCSV = csv({
      header: true,
      bom: true,
      columns: ['task_id', 'project_title', 'licence_number', 'type', 'resubmitted', 'extended', 'still_open', 'target', 'resolved_at']
    });

    logger.debug('fetching internal-deadlines report');
    const internalDeadlinesData = await metrics('/reports/internal-deadlines', { stream: false, query }, accessToken);
    logger.debug('writing internal-deadlines csv');
    internalDeadlinesData.filter(Boolean).forEach(row => internalDeadlinesCSV.write(row));
    internalDeadlinesCSV.end();

    const actionedTasksRawCSV = csv({ header: true, bom: true });
    let actionedTasksSummary = emptyStats();

    const actionedTasksSummaryCSV = csv({
      header: true,
      bom: true,
      columns: ['taskType', 'submitted', 'returned', 'approved', 'rejected', 'outstanding', 'submitToActionDays', 'assignToActionDays']
    });

    return new Promise((resolve, reject) => {
      logger.debug('fetching actioned-tasks stream');

      return metrics('/reports/actioned-tasks', { stream: true, query }, accessToken)
        .then(stream => {
          logger.debug('writing actioned-tasks-raw csv');
          stream.on('data', task => {
            console.log(task);
            actionedTasksRawCSV.write(task);
            actionedTasksSummary = summarise(actionedTasksSummary, task);
          });
          stream.on('end', () => resolve());
          stream.on('error', err => reject(err));
        });
    })
      .then(() => {
        logger.debug('summarising actioned tasks');
        actionedTasksSummary = calcMeanTimes(actionedTasksSummary);

        Object.keys(actionedTasksSummary).forEach(taskType => {
          actionedTasksSummaryCSV.write({ taskType, ...actionedTasksSummary[taskType] });
        });

        actionedTasksRawCSV.end();
        actionedTasksSummaryCSV.end();
      })
      .then(() => {
        logger.debug('creating zip file');
        const zip = archiver('zip');

        zip.on('error', err => {
          throw new Error(err);
        });

        zip.append(internalDeadlinesCSV, { name: `internal-deadlines_${start}_${end}.csv` });
        zip.append(actionedTasksRawCSV, { name: `actioned-tasks-raw_${start}_${end}.csv` });
        zip.append(actionedTasksSummaryCSV, { name: `actioned-tasks-summary_${start}_${end}.csv` });
        zip.finalize();

        logger.debug('uploading zip file');

        return s3Upload({ key: job.id, stream: zip })
          .then(result => {
            logger.debug(`upload success, etag: ${result.ETag}`);
            return { ...job.meta, etag: result.ETag };
          })
          .catch(err => {
            console.log(err);
            logger.error(err);
          });
      })
      .catch(err => {
        console.log(err);
        logger.error(err);
      });
  };
};
