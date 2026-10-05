export default () => ({
  port: parseInt(process.env.PORT || '4040', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  cors: {
    origins:
      process.env.CORS_ORIGINS?.split(',')
        .map((o) => o.trim())
        .filter(Boolean) ?? [],
  },
  files: {
    driver: process.env.STORAGE_DRIVER || 'local',
    maxBytes: parseInt(process.env.FILE_MAX_BYTES || String(5 * 1024 * 1024), 10),
    allowedTypes: (
      process.env.FILE_ALLOWED_TYPES || 'image/jpeg,image/png,image/webp,image/gif,application/pdf'
    )
      .split(',')
      .map((type) => type.trim().toLowerCase())
      .filter(Boolean),
    localRoot: process.env.LOCAL_STORAGE_ROOT || 'uploads',
    localPublicUrl: process.env.LOCAL_STORAGE_PUBLIC_URL || 'http://localhost:4040/uploads',
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      publicUrl: process.env.S3_PUBLIC_URL,
      endpoint: process.env.S3_ENDPOINT,
    },
  },
});
