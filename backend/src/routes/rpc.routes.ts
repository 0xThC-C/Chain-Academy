import { Router } from 'express';
import { rpcService } from '../services/rpc.service';
import { requireAuth } from '../middlewares/auth';
import Joi from 'joi';

const router = Router();

// Validation schemas
const rpcRequestSchema = Joi.object({
  chainId: Joi.number().integer().valid(1, 137, 42161, 10, 8453).required(),
  method: Joi.string().required(),
  params: Joi.array().optional()
});

const validateRPCRequest = (req: any, res: any, next: any) => {
  const { error } = rpcRequestSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }
  next();
};

// Whitelist of allowed RPC methods for security
const allowedMethods = [
  'eth_blockNumber',
  'eth_getBalance',
  'eth_call',
  'eth_getTransactionReceipt',
  'eth_getTransactionCount',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_getCode',
  'eth_getStorageAt',
  'eth_getLogs',
  'eth_getTransactionByHash',
  'eth_getBlockByNumber',
  'eth_getBlockByHash',
  'net_version'
];

// Generic RPC proxy endpoint
router.post('/proxy', requireAuth, validateRPCRequest, async (req, res) => {
  try {
    const { chainId, method, params } = req.body;

    // Security check: only allow whitelisted methods
    if (!allowedMethods.includes(method)) {
      return res.status(403).json({
        success: false,
        error: `Method ${method} is not allowed`
      });
    }

    const result = await rpcService.makeRPCCall(chainId, {
      method,
      params: params || []
    });

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('RPC proxy error:', error);
    res.status(500).json({
      success: false,
      error: 'RPC call failed'
    });
  }
});

// Specific endpoints for common operations
router.get('/block-number/:chainId', requireAuth, async (req, res) => {
  try {
    const chainId = parseInt(req.params.chainId);
    const blockNumber = await rpcService.getBlockNumber(chainId);
    
    res.json({
      success: true,
      blockNumber
    });
  } catch (error) {
    console.error('Get block number error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get block number'
    });
  }
});

router.get('/balance/:chainId/:address', requireAuth, async (req, res) => {
  try {
    const chainId = parseInt(req.params.chainId);
    const { address } = req.params;
    
    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address format'
      });
    }
    
    const balance = await rpcService.getBalance(chainId, address);
    
    res.json({
      success: true,
      balance
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get balance'
    });
  }
});

export default router;