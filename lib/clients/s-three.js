const AWS = require('aws-sdk');

module.exports = settings => {
  const S3 = new AWS.S3({
    apiVersion: '2006-03-01',
    region: settings.region,
    accessKeyId: settings.accessKey,
    secretAccessKey: settings.secret
  });

  const upload = ({ key, stream }) => {
    const params = {
      Bucket: settings.bucket,
      Body: stream,
      Key: key,
      ServerSideEncryption: settings.kms ? 'aws:kms' : undefined,
      SSEKMSKeyId: settings.kms
    };

    return new Promise((resolve, reject) => {
      S3.upload(params, (err, result) => {
        err ? reject(err) : resolve(result);
      });
    });
  };

  return upload;
};
