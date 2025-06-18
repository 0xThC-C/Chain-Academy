import { Router } from 'express';
import { profileController } from '../controllers/profile.controller';
import { requireAuth } from '../middlewares/auth';
import { validateBody } from '../middlewares/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const updateProfileSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).optional(),
  bio: Joi.string().max(500).optional(),
  avatar: Joi.string().uri().optional(),
  isMentor: Joi.boolean().optional(),
  skills: Joi.array().items(Joi.string()).optional(),
  hourlyRate: Joi.number().positive().optional(),
  currency: Joi.string().valid('USDT', 'USDC').optional(),
  availability: Joi.object({
    timezone: Joi.string().required(),
    schedule: Joi.array().items(
      Joi.object({
        dayOfWeek: Joi.number().integer().min(0).max(6).required(),
        startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      })
    ).required(),
  }).optional(),
});

// Routes
router.get('/', requireAuth, profileController.getProfile);
router.put('/', requireAuth, validateBody(updateProfileSchema), profileController.updateProfile);
router.get('/:address', profileController.getPublicProfile);

export default router;