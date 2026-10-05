import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(4040),
  API_TITLE: Joi.string().optional(),
  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().optional(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('24h'),
  JWT_REFRESH_SECRET: Joi.string().optional(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  CORS_ORIGINS: Joi.string().optional(),
  STORAGE_DRIVER: Joi.string().valid('local', 's3').default('local'),
  FILE_MAX_BYTES: Joi.number()
    .integer()
    .positive()
    .default(5 * 1024 * 1024),
  FILE_ALLOWED_TYPES: Joi.string().default(
    'image/jpeg,image/png,image/webp,image/gif,application/pdf',
  ),
  LOCAL_STORAGE_ROOT: Joi.string().default('uploads'),
  LOCAL_STORAGE_PUBLIC_URL: Joi.string().default('http://localhost:4040/uploads'),
  S3_BUCKET: Joi.string().when('STORAGE_DRIVER', { is: 's3', then: Joi.required() }),
  S3_REGION: Joi.string().when('STORAGE_DRIVER', { is: 's3', then: Joi.required() }),
  S3_ACCESS_KEY_ID: Joi.string().when('STORAGE_DRIVER', { is: 's3', then: Joi.required() }),
  S3_SECRET_ACCESS_KEY: Joi.string().when('STORAGE_DRIVER', { is: 's3', then: Joi.required() }),
  S3_PUBLIC_URL: Joi.string().when('STORAGE_DRIVER', { is: 's3', then: Joi.required() }),
  S3_ENDPOINT: Joi.string().optional(),
});
