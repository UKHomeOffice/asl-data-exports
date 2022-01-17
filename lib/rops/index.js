const builder = require('./builder');
const S3 = require('../clients/s-three');

module.exports = settings => {
  const models = settings.models;
  const upload = S3(settings.s3);

  return builder({ models, upload });
};
