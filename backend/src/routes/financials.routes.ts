import { Router } from 'express';
import { financialsController } from '../controllers/financials.controller';
import { requireAuth } from '../middlewares/auth';
import { validateQuery } from '../middlewares/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const getEarningsQuerySchema = Joi.object({
  currency: Joi.string().valid('USDT', 'USDC').optional(),
  status: Joi.string().valid('pending', 'completed', 'withdrawn').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(50).optional().default(10),
});

// Routes
router.get('/earnings', requireAuth, validateQuery(getEarningsQuerySchema), financialsController.getEarnings);
router.get('/summary', requireAuth, financialsController.getFinancialSummary);
router.get('/transactions', requireAuth, validateQuery(getEarningsQuerySchema), financialsController.getTransactionHistory);

export default router;