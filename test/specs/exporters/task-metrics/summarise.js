const assert = require('assert');
const { merge } = require('lodash');
const emptyStats = require('../../../../lib/exporters/task-metrics/empty-stats');
const summarise = require('../../../../lib/exporters/task-metrics/summarise');

describe('Task Metrics', () => {

  describe('Summarise results', () => {

    it('it has no affect on the stats if there is no metrics prop', () => {
      const stats = emptyStats();
      const task = {};
      assert.deepEqual(summarise(stats, task), emptyStats());
    });

    it('it has no affect on the stats if there is no taskType', () => {
      const stats = emptyStats();
      const task = { metrics: { returnedCount: 50 } };
      assert.deepEqual(summarise(stats, task), emptyStats());
    });

    it('it has no affect on the stats if taskType is "other"', () => {
      const stats = emptyStats();
      const task = { metrics: { taskType: 'other', returnedCount: 50 } };
      assert.deepEqual(summarise(stats, task), emptyStats());
    });

    it('counts submitted tasks', () => {
      let stats = emptyStats();
      const task1 = { metrics: { taskType: 'pplApplication', wasSubmitted: true } };
      const task2 = { metrics: { taskType: 'pplApplication', wasSubmitted: true } };
      const task3 = { metrics: { taskType: 'pplApplication', wasSubmitted: true } };

      const expected = merge({}, emptyStats(), {
        pplApplication: {
          submitted: 3
        }
      });

      stats = summarise(stats, task1);
      stats = summarise(stats, task2);
      stats = summarise(stats, task3);

      assert.deepEqual(stats, expected);
    });

    it('counts approved tasks if they have a resolvedAt time', () => {
      let stats = emptyStats();
      const task1 = { status: 'resolved', metrics: { taskType: 'pplApplication', resolvedAt: '2021-12-01' } };
      const task2 = { status: 'resolved', metrics: { taskType: 'pplApplication' } };
      const task3 = { status: 'resolved', metrics: { taskType: 'pplApplication', resolvedAt: '2021-12-31' } };

      const expected = merge({}, emptyStats(), {
        pplApplication: {
          approved: 2
        }
      });

      stats = summarise(stats, task1);
      stats = summarise(stats, task2);
      stats = summarise(stats, task3);

      assert.deepEqual(stats, expected);
    });

    it('counts rejected tasks if they have a resolvedAt time', () => {
      let stats = emptyStats();
      const task1 = { status: 'rejected', metrics: { taskType: 'pplApplication' } };
      const task2 = { status: 'rejected', metrics: { taskType: 'pplApplication', resolvedAt: '2021-12-01' } };
      const task3 = { status: 'rejected', metrics: { taskType: 'pplApplication' } };

      const expected = merge({}, emptyStats(), {
        pplApplication: {
          rejected: 1
        }
      });

      stats = summarise(stats, task1);
      stats = summarise(stats, task2);
      stats = summarise(stats, task3);

      assert.deepEqual(stats, expected);
    });

    it('counts returned tasks', () => {
      let stats = emptyStats();
      const task1 = { metrics: { taskType: 'pplApplication', returnedCount: 2 } };
      const task2 = { metrics: { taskType: 'pplApplication', returnedCount: 3 } };
      const task3 = { metrics: { taskType: 'pplApplication', returnedCount: 5 } };

      const expected = merge({}, emptyStats(), {
        pplApplication: {
          returned: 10
        }
      });

      stats = summarise(stats, task1);
      stats = summarise(stats, task2);
      stats = summarise(stats, task3);

      assert.deepEqual(stats, expected);
    });

    it('counts outstanding tasks', () => {
      let stats = emptyStats();
      const task1 = { metrics: { taskType: 'pplApplication', isOutstanding: true } };
      const task2 = { metrics: { taskType: 'pplApplication', isOutstanding: true } };
      const task3 = { metrics: { taskType: 'pplApplication' } };
      const task4 = { metrics: { taskType: 'pplApplication', isOutstanding: false } };

      const expected = merge({}, emptyStats(), {
        pplApplication: {
          outstanding: 2
        }
      });

      stats = summarise(stats, task1);
      stats = summarise(stats, task2);
      stats = summarise(stats, task3);
      stats = summarise(stats, task4);

      assert.deepEqual(stats, expected);
    });

    it('pushes submit to action diffs to submitToActionDays so they can be averaged', () => {
      let stats = emptyStats();
      const task1 = { metrics: { taskType: 'pplApplication', submitToActionDiff: 3 } };
      const task2 = { metrics: { taskType: 'pplApplication', submitToActionDiff: 1 } };
      const task3 = { metrics: { taskType: 'pplApplication' } };
      const task4 = { metrics: { taskType: 'pplApplication', submitToActionDiff: 0 } };

      const expected = merge({}, emptyStats(), {
        pplApplication: {
          submitToActionDays: [3, 1, 0]
        }
      });

      stats = summarise(stats, task1);
      stats = summarise(stats, task2);
      stats = summarise(stats, task3);
      stats = summarise(stats, task4);

      assert.deepEqual(stats, expected);
    });

    it('pushes assign to action diffs to assignToActionDays so they can be averaged', () => {
      let stats = emptyStats();
      const task1 = { metrics: { taskType: 'pplApplication', assignToActionDiff: 0 } };
      const task2 = { metrics: { taskType: 'pplApplication', assignToActionDiff: 2 } };
      const task3 = { metrics: { taskType: 'pplApplication' } };
      const task4 = { metrics: { taskType: 'pplApplication', assignToActionDiff: 1 } };

      const expected = merge({}, emptyStats(), {
        pplApplication: {
          assignToActionDays: [0, 2, 1]
        }
      });

      stats = summarise(stats, task1);
      stats = summarise(stats, task2);
      stats = summarise(stats, task3);
      stats = summarise(stats, task4);

      assert.deepEqual(stats, expected);
    });

  });

});
