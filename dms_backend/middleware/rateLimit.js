import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const limiterConfig = {
  windowMs:        15 * 60 * 1000,
  max:             3,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => ipKeyGenerator(req),
};

export const forgotPwLimiter   = rateLimit(limiterConfig);
export const resetPwLimiter    = rateLimit(limiterConfig);
export const adminPatchLimiter = rateLimit(limiterConfig);
