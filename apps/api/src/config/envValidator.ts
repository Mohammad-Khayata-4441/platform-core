import * as Joi from 'joi';

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
});
