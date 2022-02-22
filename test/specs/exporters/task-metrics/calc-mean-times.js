const assert = require('assert');
const calcMeanTimes = require('../../../../lib/exporters/task-metrics/calc-mean-times');

describe('Task Metrics', () => {

  describe('Mean time calculator', () => {

    it('returns dash for empty values', () => {
      const stats = {
        pplApplication: {
          submitToActionDays: [],
          resubmitToActionDays: [],
          assignToActionDays: []
        }
      };

      const expected = {
        pplApplication: {
          submitToActionDaysMean: '-',
          submitToActionDaysMedian: '-',
          resubmitToActionDaysMean: '-',
          resubmitToActionDaysMedian: '-',
          assignToActionDaysMean: '-',
          assignToActionDaysMedian: '-'
        }
      };

      assert.deepEqual(calcMeanTimes(stats), expected);
    });

    it('returns zero for zero values', () => {
      const stats = {
        pplApplication: {
          submitToActionDays: [0, 0, 0, 0],
          resubmitToActionDays: [0, 0, 0, 0],
          assignToActionDays: [0, 0]
        }
      };

      const expected = {
        pplApplication: {
          submitToActionDaysMean: 0,
          submitToActionDaysMedian: 0,
          resubmitToActionDaysMean: 0,
          resubmitToActionDaysMedian: 0,
          assignToActionDaysMean: 0,
          assignToActionDaysMedian: 0
        }
      };

      assert.deepEqual(calcMeanTimes(stats), expected);
    });

    it('calculates the mean time taken from submission to action', () => {
      const stats = {
        pplApplication: {
          submitToActionDays: [1, 2, 2, 3],
          resubmitToActionDays: [1, 2, 2, 3],
          assignToActionDays: []
        }
      };

      const expected = {
        pplApplication: {
          submitToActionDaysMean: 2,
          submitToActionDaysMedian: 2,
          resubmitToActionDaysMean: 2,
          resubmitToActionDaysMedian: 2,
          assignToActionDaysMean: '-',
          assignToActionDaysMedian: '-'
        }
      };

      assert.deepEqual(calcMeanTimes(stats), expected);
    });

    it('calculates the mean time taken from assign to action', () => {
      const stats = {
        pplApplication: {
          submitToActionDays: [],
          resubmitToActionDays: [],
          assignToActionDays: [5, 4, 3, 2, 1]
        }
      };

      const expected = {
        pplApplication: {
          submitToActionDaysMean: '-',
          submitToActionDaysMedian: '-',
          resubmitToActionDaysMean: '-',
          resubmitToActionDaysMedian: '-',
          assignToActionDaysMean: 3,
          assignToActionDaysMedian: 3
        }
      };

      assert.deepEqual(calcMeanTimes(stats), expected);
    });

    it('calculates the median values correctly for odd and even length arrays and empty arrays', () => {
      const stats = {
        pplApplication: {
          submitToActionDays: [5, 2, 10, 9, 30],
          resubmitToActionDays: [2, 6, 1, 8],
          assignToActionDays: []
        }
      };
      const output = calcMeanTimes(stats);

      // middle entry of ordered array for odd length arrays
      assert.equal(output.pplApplication.submitToActionDaysMedian, 9);

      // mean of two middle entries of ordered array for even length arrays
      assert.equal(output.pplApplication.resubmitToActionDaysMedian, 4);

      // `-` if array is empty
      assert.equal(output.pplApplication.assignToActionDaysMedian, '-');

    });

  });

});
