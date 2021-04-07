module.exports = {
  interval: parseInt(process.env.INTERVAL, 10),
  s3: {
    region: process.env.S3_REGION,
    accessKey: process.env.S3_ACCESS_KEY,
    secret: process.env.S3_SECRET,
    bucket: process.env.S3_BUCKET,
    kms: process.env.S3_KMS_KEY_ID
  },
  db: {
    database: process.env.DATABASE_NAME,
    host: process.env.DATABASE_HOST,
    password: process.env.DATABASE_PASSWORD,
    port: process.env.DATABASE_PORT,
    username: process.env.DATABASE_USERNAME || 'postgres'
  }
};
