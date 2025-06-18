import { Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';

class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = AuthService.getInstance();
  }

  /**
   * Generate nonce for SIWE authentication
   */
  public getNonce = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { address, chainId } = req.body;

      // Validate address format
      if (!this.authService.isValidAddress(address)) {
        res.status(400).json({
          success: false,
          message: 'Invalid Ethereum address format',
        });
        return;
      }

      // Validate supported chain
      if (!this.authService.isSupportedChain(chainId)) {
        res.status(400).json({
          success: false,
          message: 'Chain not supported',
        });
        return;
      }

      // Generate nonce
      const nonce = this.authService.generateNonce();

      // Store nonce in session
      req.session.nonce = nonce;
      req.session.address = address;
      req.session.chainId = chainId;

      // Create SIWE message
      const domain = new URL(req.headers.origin || 'http://localhost:3000').hostname;
      const uri = req.headers.origin || 'http://localhost:3000';
      
      const siweMessage = this.authService.createSiweMessage(
        address,
        chainId,
        nonce,
        domain,
        uri,
      );

      res.json({
        success: true,
        message: siweMessage.prepareMessage(),
        nonce,
      });
    } catch (error) {
      logger.error('Error generating nonce:', error);
      next(error);
    }
  };

  /**
   * Verify SIWE signature
   */
  public verifySignature = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { message, signature } = req.body;

      // Check if signature is expired
      if (this.authService.isSignatureExpired(message)) {
        res.status(400).json({
          success: false,
          message: 'Signature expired',
        });
        return;
      }

      // Verify signature
      const verificationResult = await this.authService.verifySiweSignature(
        message,
        signature,
      );

      if (!verificationResult.success) {
        res.status(401).json({
          success: false,
          message: verificationResult.error || 'Authentication failed',
        });
        return;
      }

      // Store authentication info in session
      req.session.address = verificationResult.address;
      req.session.siwe = JSON.parse(message);

      logger.info(`User authenticated: ${verificationResult.address}`);

      res.json({
        success: true,
        message: 'Authentication successful',
        user: {
          address: verificationResult.address,
          chainId: req.session.chainId,
        },
      });
    } catch (error) {
      logger.error('Error verifying signature:', error);
      next(error);
    }
  };

  /**
   * Logout user
   */
  public logout = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const address = req.session.address;
      
      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          logger.error('Error destroying session:', err);
          res.status(500).json({
            success: false,
            message: 'Logout failed',
          });
          return;
        }

        logger.info(`User logged out: ${address}`);
        res.json({
          success: true,
          message: 'Logout successful',
        });
      });
    } catch (error) {
      logger.error('Error during logout:', error);
      next(error);
    }
  };

  /**
   * Get current authenticated user
   */
  public getCurrentUser = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.session.address) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      res.json({
        success: true,
        user: {
          address: req.session.address,
          chainId: req.session.chainId,
        },
      });
    } catch (error) {
      logger.error('Error getting current user:', error);
      next(error);
    }
  };
}

export const authController = new AuthController();