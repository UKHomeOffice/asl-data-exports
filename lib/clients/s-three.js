const AWS = require('aws-sdk');

module.exports = settings => {
  const config = {
    apiVersion: '2006-03-01',
    region: settings.region,
    accessKeyId: settings.accessKey,
    secretAccessKey: settings.secret
  };

  if (settings.endpoint) {
    // force the client to use path based URLs instead of subdomains, e.g. http://localhost/bucket instead of http://bucket.localhost
    // will be renamed to forcePathStyle in v3 sdk
    config.s3ForcePathStyle = true;
    config.endpoint = settings.endpoint;
  }

  const S3 = new AWS.S3(config);

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
