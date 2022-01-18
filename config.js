module.exports = {
  logLevel: process.env.LOG_LEVEL || 'info',
  interval: parseInt(process.env.INTERVAL, 10),
  s3: {
    region: process.env.S3_REGION,
    accessKey: process.env.S3_ACCESS_KEY,
    secret: process.env.S3_SECRET,
    bucket: process.env.S3_BUCKET,
    kms: process.env.S3_KMS_KEY_ID,
    endpoint: process.env.S3_ENDPOINT
  },
  db: {
    database: process.env.DATABASE_NAME,
    host: process.env.DATABASE_HOST,
    password: process.env.DATABASE_PASSWORD,
    port: process.env.DATABASE_PORT,
    username: process.env.DATABASE_USERNAME || 'postgres'
  },
  auth: {
    realm: process.env.KEYCLOAK_REALM,
    url: process.env.KEYCLOAK_URL,
    client: process.env.KEYCLOAK_CLIENT,
    secret: process.env.KEYCLOAK_SECRET,
    username: process.env.KEYCLOAK_USERNAME || 'data-exports',
    password: process.env.KEYCLOAK_PASSWORD
  },
  metrics: {
    url: process.env.METRICS_SERVICE
  }
};
