import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateBody } from '../middlewares/validation';
import Joi from 'joi';
import { authLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Validation schemas
const nonceRequestSchema = Joi.object({
  address: Joi.string().required(),
  chainId: Joi.number().integer().required(),
});

const verifySignatureSchema = Joi.object({
  message: Joi.string().required(),
  signature: Joi.string().required(),
});

// Routes with rate limiting
router.post('/nonce', authLimiter, validateBody(nonceRequestSchema), authController.getNonce);
router.post('/verify', authLimiter, validateBody(verifySignatureSchema), authController.verifySignature);
router.post('/logout', authController.logout);
router.get('/me', authController.getCurrentUser);

export default router;