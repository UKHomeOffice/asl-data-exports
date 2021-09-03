const AWS = require('aws-sdk');
const builder = require('./builder');

module.exports = ({ models, s3 }) => {
  const S3 = new AWS.S3({
    apiVersion: '2006-03-01',
    region: s3.region,
    accessKeyId: s3.accessKey,
    secretAccessKey: s3.secret
  });

  const upload = ({ key, stream }) => {
    const params = {
      Bucket: s3.bucket,
      Body: stream,
      Key: key,
      ServerSideEncryption: s3.kms ? 'aws:kms' : undefined,
      SSEKMSKeyId: s3.kms
    };

    return new Promise((resolve, reject) => {
      S3.upload(params, (err, result) => {
        err ? reject(err) : resolve(result);
      });
    });
  };

  return builder({ models, upload });
};
