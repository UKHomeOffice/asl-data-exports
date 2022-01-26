const assert = require('assert');
const calcMeanTimes = require('../../../../lib/exporters/task-metrics/calc-mean-times');

describe('Task Metrics', () => {

  describe('Mean time calculator', () => {

    it('returns dash for empty values', () => {
      const stats = {
        pplApplication: {
          submitToActionDays: [],
          assignToActionDays: []
        }
      };

      const expected = {
        pplApplication: {
          submitToActionDays: '-',
          assignToActionDays: '-'
        }
      };

      assert.deepEqual(calcMeanTimes(stats), expected);
    });

    it('returns zero for zero values', () => {
      const stats = {
        pplApplication: {
          submitToActionDays: [0, 0, 0, 0],
          assignToActionDays: [0, 0]
        }
      };

      const expected = {
        pplApplication: {
          submitToActionDays: 0,
          assignToActionDays: 0
        }
      };

      assert.deepEqual(calcMeanTimes(stats), expected);
    });

    it('calculates the mean time taken from submission to action', () => {
      const stats = {
        pplApplication: {
          submitToActionDays: [1, 2, 2, 3],
          assignToActionDays: []
        }
      };

      const expected = {
        pplApplication: {
          submitToActionDays: 2,
          assignToActionDays: '-'
        }
      };

      assert.deepEqual(calcMeanTimes(stats), expected);
    });

    it('calculates the mean time taken from assign to action', () => {
      const stats = {
        pplApplication: {
          submitToActionDays: [],
          assignToActionDays: [5, 4, 3, 2, 1]
        }
      };

      const expected = {
        pplApplication: {
          submitToActionDays: '-',
          assignToActionDays: 3
        }
      };

      assert.deepEqual(calcMeanTimes(stats), expected);
    });

  });

});
