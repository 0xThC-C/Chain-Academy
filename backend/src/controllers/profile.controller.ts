import { Response, NextFunction } from 'express';
import { AuthRequest, UserProfile } from '../types';
import { logger } from '../utils/logger';

class ProfileController {
  /**
   * Get user's own profile
   */
  public getProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const address = req.session.address!;

      // TODO: Implement database query
      // For now, return mock data
      const profile: UserProfile = {
        address,
        username: `user_${address.slice(2, 8)}`,
        bio: '',
        avatar: '',
        isMentor: false,
        skills: [],
        hourlyRate: 0,
        currency: 'USDT',
        availability: {
          timezone: 'UTC',
          schedule: [],
        },
        rating: 0,
        totalSessions: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      res.json({
        success: true,
        profile,
      });
    } catch (error) {
      logger.error('Error getting profile:', error);
      next(error);
    }
  };

  /**
   * Update user profile
   */
  public updateProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const address = req.session.address!;
      const updateData = req.body;

      // TODO: Implement database update
      logger.info(`Profile update for ${address}:`, updateData);

      // Mock updated profile
      const updatedProfile: UserProfile = {
        address,
        username: updateData.username || `user_${address.slice(2, 8)}`,
        bio: updateData.bio || '',
        avatar: updateData.avatar || '',
        isMentor: updateData.isMentor || false,
        skills: updateData.skills || [],
        hourlyRate: updateData.hourlyRate || 0,
        currency: updateData.currency || 'USDT',
        availability: updateData.availability || {
          timezone: 'UTC',
          schedule: [],
        },
        rating: 0,
        totalSessions: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      res.json({
        success: true,
        message: 'Profile updated successfully',
        profile: updatedProfile,
      });
    } catch (error) {
      logger.error('Error updating profile:', error);
      next(error);
    }
  };

  /**
   * Get public profile by address
   */
  public getPublicProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { address } = req.params;

      // Validate address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        res.status(400).json({
          success: false,
          message: 'Invalid address format',
        });
        return;
      }

      // TODO: Implement database query
      // For now, return mock public profile
      const publicProfile = {
        address,
        username: `user_${address.slice(2, 8)}`,
        bio: 'Blockchain enthusiast and mentor.',
        avatar: '',
        isMentor: true,
        skills: ['Solidity', 'Web3', 'DeFi'],
        hourlyRate: 50,
        currency: 'USDT' as const,
        availability: {
          timezone: 'UTC',
          schedule: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
          ],
        },
        rating: 4.8,
        totalSessions: 25,
      };

      res.json({
        success: true,
        profile: publicProfile,
      });
    } catch (error) {
      logger.error('Error getting public profile:', error);
      next(error);
    }
  };
}

export const profileController = new ProfileController();