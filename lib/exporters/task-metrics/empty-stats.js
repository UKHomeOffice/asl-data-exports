const { cloneDeep } = require('lodash');

const stats = {
  submitted: 0,
  returned: 0,
  approved: 0,
  rejected: 0,
  outstanding: 0,
  submitToActionDays: [],
  assignToActionDays: []
};

module.exports = () => ({
  pplApplication: cloneDeep(stats),
  pplAmendment: cloneDeep(stats),
  ra: cloneDeep(stats),
  pel: cloneDeep(stats),
  pilApplication: cloneDeep(stats),
  pilAmendment: cloneDeep(stats),
  pilRevocation: cloneDeep(stats),
  trainingPil: cloneDeep(stats)
});
