import { Router } from 'express';
import { myMentorshipsController } from '../controllers/myMentorships.controller';
import { requireAuth } from '../middlewares/auth';
import { validateQuery, validateBody } from '../middlewares/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const getSessionsQuerySchema = Joi.object({
  status: Joi.string().valid('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED').optional(),
  role: Joi.string().valid('mentor', 'student').optional(),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(50).optional().default(10),
});

const updateSessionStatusSchema = Joi.object({
  status: Joi.string().valid('IN_PROGRESS', 'COMPLETED', 'CANCELLED').required(),
});

const submitFeedbackSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(500).optional(),
});

// Routes
router.get('/sessions', requireAuth, validateQuery(getSessionsQuerySchema), myMentorshipsController.getMySessions);
router.get('/mentorships', requireAuth, myMentorshipsController.getMyMentorships);
router.put('/sessions/:sessionId/status', requireAuth, validateBody(updateSessionStatusSchema), myMentorshipsController.updateSessionStatus);
router.post('/sessions/:sessionId/feedback', requireAuth, validateBody(submitFeedbackSchema), myMentorshipsController.submitFeedback);
router.get('/sessions/:sessionId', requireAuth, myMentorshipsController.getSessionDetails);

export default router;