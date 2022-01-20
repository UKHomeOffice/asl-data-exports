const { S3 } = require('@asl/service/clients');

module.exports = settings => {
  const s3Client = S3({ s3: settings });

  const upload = ({ key, stream }) => {
    const params = {
      Bucket: settings.bucket,
      Body: stream,
      Key: key,
      ServerSideEncryption: settings.kms ? 'aws:kms' : undefined,
      SSEKMSKeyId: settings.kms
    };

    return new Promise((resolve, reject) => {
      s3Client.upload(params, (err, result) => {
        err ? reject(err) : resolve(result);
      });
    });
  };

  return upload;
};
