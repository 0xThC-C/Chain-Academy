import { Router } from 'express';
import { mentorshipController } from '../controllers/mentorship.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth';
import { validateBody, validateQuery } from '../middlewares/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const createMentorshipSchema = Joi.object({
  title: Joi.string().min(5).max(100).required(),
  description: Joi.string().min(20).max(1000).required(),
  category: Joi.string().required(),
  skills: Joi.array().items(Joi.string()).min(1).required(),
  duration: Joi.number().integer().min(30).max(480).required(), // 30 minutes to 8 hours
  price: Joi.number().positive().required(),
  currency: Joi.string().valid('USDT', 'USDC').required(),
  maxStudents: Joi.number().integer().min(1).max(10).optional().default(1),
});

const updateMentorshipSchema = Joi.object({
  title: Joi.string().min(5).max(100).optional(),
  description: Joi.string().min(20).max(1000).optional(),
  category: Joi.string().optional(),
  skills: Joi.array().items(Joi.string()).min(1).optional(),
  duration: Joi.number().integer().min(30).max(480).optional(),
  price: Joi.number().positive().optional(),
  currency: Joi.string().valid('USDT', 'USDC').optional(),
  maxStudents: Joi.number().integer().min(1).max(10).optional(),
  isActive: Joi.boolean().optional(),
});

const searchQuerySchema = Joi.object({
  category: Joi.string().optional(),
  skills: Joi.string().optional(), // comma-separated skills
  minPrice: Joi.number().positive().optional(),
  maxPrice: Joi.number().positive().optional(),
  currency: Joi.string().valid('USDT', 'USDC').optional(),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(50).optional().default(10),
  sortBy: Joi.string().valid('price', 'rating', 'created', 'updated').optional().default('created'),
  sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc'),
});

const bookSessionSchema = Joi.object({
  mentorshipId: Joi.string().required(),
  scheduledAt: Joi.date().iso().required(),
});

// Routes
router.get('/', optionalAuth, validateQuery(searchQuerySchema), mentorshipController.searchMentorships);
router.post('/', requireAuth, validateBody(createMentorshipSchema), mentorshipController.createMentorship);
router.get('/:id', optionalAuth, mentorshipController.getMentorship);
router.put('/:id', requireAuth, validateBody(updateMentorshipSchema), mentorshipController.updateMentorship);
router.delete('/:id', requireAuth, mentorshipController.deleteMentorship);
router.post('/book', requireAuth, validateBody(bookSessionSchema), mentorshipController.bookSession);

export default router;