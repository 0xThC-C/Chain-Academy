import { SiweMessage } from 'siwe';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';

export class AuthService {
  private static instance: AuthService;

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Generate a random nonce for SIWE authentication
   */
  public generateNonce(): string {
    return ethers.randomBytes(32).toString();
  }

  /**
   * Create a SIWE message for signing
   */
  public createSiweMessage(
    address: string,
    chainId: number,
    nonce: string,
    domain: string,
    uri: string,
  ): SiweMessage {
    const message = new SiweMessage({
      domain,
      address,
      statement: 'Sign in to Chain Academy V2 - Decentralized Mentorship Platform',
      uri,
      version: '1',
      chainId,
      nonce,
      issuedAt: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    });

    return message;
  }

  /**
   * Verify a SIWE signature
   */
  public async verifySiweSignature(
    message: string,
    signature: string,
  ): Promise<{ success: boolean; address?: string; error?: string }> {
    try {
      const siweMessage = new SiweMessage(message);
      
      // Verify the signature
      const result = await siweMessage.verify({ signature });
      
      if (result.success) {
        logger.info(`SIWE verification successful for address: ${siweMessage.address}`);
        return {
          success: true,
          address: siweMessage.address,
        };
      } else {
        logger.warn(`SIWE verification failed: ${result.error?.type}`);
        return {
          success: false,
          error: 'Invalid signature',
        };
      }
    } catch (error) {
      logger.error(`SIWE verification error: ${error}`);
      return {
        success: false,
        error: 'Verification failed',
      };
    }
  }

  /**
   * Check if the signature is expired
   */
  public isSignatureExpired(message: string): boolean {
    try {
      const siweMessage = new SiweMessage(message);
      if (siweMessage.expirationTime) {
        return new Date() > new Date(siweMessage.expirationTime);
      }
      return false;
    } catch {
      return true;
    }
  }

  /**
   * Validate Ethereum address format
   */
  public isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Check if chain ID is supported
   */
  public isSupportedChain(chainId: number): boolean {
    const supportedChains = process.env.SUPPORTED_CHAINS?.split(',').map(Number) || [1, 137, 42161, 10, 8453];
    return supportedChains.includes(chainId);
  }
}