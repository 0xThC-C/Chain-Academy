// Payment Confirmation Service for Chain Academy
// Handles manual confirmation by mentors and prevents double-payment

export interface SessionToConfirm {
  sessionId: string;
  mentorAddress: string;
  studentAddress: string;
  sessionTitle: string;
  totalAmount: number;
  actualDuration: number; // Actual minutes spent
  scheduledDuration: number; // Originally scheduled duration
  percentageCompleted: number; // Calculation: (actualDuration / scheduledDuration) * 100
  earnedAmount: number; // totalAmount * (percentageCompleted / 100) 
  completedAt: string; // ISO date string
  chainId: number;
  status: 'pending_confirmation' | 'manually_confirmed' | 'auto_paid';
}

export class PaymentConfirmationService {
  
  /**
   * Get all sessions waiting for manual confirmation by mentor
   */
  static getPendingConfirmations(mentorAddress: string): SessionToConfirm[] {
    if (!mentorAddress) return [];

    const completedSessions = JSON.parse(localStorage.getItem('completed_sessions') || '[]');
    
    return completedSessions
      .filter((session: any) => 
        session.mentorAddress?.toLowerCase() === mentorAddress.toLowerCase() &&
        session.status === 'completed' &&
        !session.paymentConfirmed && // Not manually confirmed
        !session.autoPaid // Not auto-paid yet
      )
      .map((session: any) => {
        const totalAmount = session.totalAmount || session.priceUSDC || 0;
        const scheduledDuration = session.sessionDuration || 60;
        const actualDuration = session.actualDuration || scheduledDuration;
        const percentageCompleted = Math.min(100, (actualDuration / scheduledDuration) * 100);
        const earnedAmount = (totalAmount * percentageCompleted) / 100;

        return {
          sessionId: session.sessionId || session.id,
          mentorAddress: session.mentorAddress,
          studentAddress: session.studentAddress || session.student,
          sessionTitle: session.title || session.mentorshipTitle || 'Session',
          totalAmount,
          actualDuration,
          scheduledDuration,
          percentageCompleted: Math.round(percentageCompleted),
          earnedAmount: Number(earnedAmount.toFixed(2)),
          completedAt: session.completedAt,
          chainId: session.chainId || 11155111, // Default to Sepolia
          status: 'pending_confirmation'
        };
      });
  }

  /**
   * Manually confirm payment for a session
   */
  static confirmPayment(sessionId: string, mentorAddress: string): boolean {
    try {
      // Update completed sessions
      const completedSessions = JSON.parse(localStorage.getItem('completed_sessions') || '[]');
      const updatedSessions = completedSessions.map((session: any) => {
        if ((session.sessionId || session.id) === sessionId &&
            session.mentorAddress?.toLowerCase() === mentorAddress.toLowerCase()) {
          return {
            ...session,
            paymentConfirmed: true,
            paymentConfirmedAt: new Date().toISOString(),
            paymentMethod: 'manual',
            percentageCompleted: Math.min(100, ((session.actualDuration || session.sessionDuration || 60) / (session.sessionDuration || 60)) * 100)
          };
        }
        return session;
      });

      localStorage.setItem('completed_sessions', JSON.stringify(updatedSessions));

      // Add to mentor earnings
      const session = completedSessions.find((s: any) => 
        (s.sessionId || s.id) === sessionId &&
        s.mentorAddress?.toLowerCase() === mentorAddress.toLowerCase()
      );

      if (session) {
        const totalAmount = session.totalAmount || session.priceUSDC || 0;
        const actualDuration = session.actualDuration || session.sessionDuration || 60;
        const scheduledDuration = session.sessionDuration || 60;
        const percentageCompleted = Math.min(100, (actualDuration / scheduledDuration) * 100);
        const earnedAmount = (totalAmount * percentageCompleted) / 100;

        const mentorKey = `mentor_earnings_${mentorAddress}`;
        const currentEarnings = JSON.parse(localStorage.getItem(mentorKey) || '[]');
        currentEarnings.push({
          sessionId,
          amount: Number(earnedAmount.toFixed(2)),
          confirmedAt: new Date().toISOString(),
          method: 'manual',
          sessionTitle: session.title || session.mentorshipTitle || 'Session',
          studentName: session.studentName || 'Student',
          percentageCompleted: Math.round(percentageCompleted),
          actualDuration,
          scheduledDuration,
          chainId: session.chainId || 11155111
        });
        localStorage.setItem(mentorKey, JSON.stringify(currentEarnings));

        console.log('✅ Payment manually confirmed:', {
          sessionId,
          mentor: mentorAddress,
          amount: earnedAmount,
          percentage: Math.round(percentageCompleted)
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error confirming payment:', error);
      return false;
    }
  }

  /**
   * Check if a session is eligible for auto-payment (24h+ without manual confirmation)
   */
  static isEligibleForAutoPayment(sessionId: string): boolean {
    const completedSessions = JSON.parse(localStorage.getItem('completed_sessions') || '[]');
    const session = completedSessions.find((s: any) => (s.sessionId || s.id) === sessionId);
    
    if (!session || session.paymentConfirmed || session.autoPaid) {
      return false;
    }

    const completedAt = new Date(session.completedAt);
    const hoursElapsed = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60);
    
    return hoursElapsed >= 24; // 24 hours delay
  }

  /**
   * Mark session as auto-paid (called by bot)
   */
  static markAsAutoPaid(sessionId: string, transactionHash: string): boolean {
    try {
      const completedSessions = JSON.parse(localStorage.getItem('completed_sessions') || '[]');
      const updatedSessions = completedSessions.map((session: any) => {
        if ((session.sessionId || session.id) === sessionId) {
          return {
            ...session,
            autoPaid: true,
            autoPaidAt: new Date().toISOString(),
            autoPaymentTxHash: transactionHash,
            paymentMethod: 'automatic'
          };
        }
        return session;
      });

      localStorage.setItem('completed_sessions', JSON.stringify(updatedSessions));
      
      console.log('🤖 Session marked as auto-paid:', {
        sessionId,
        transactionHash
      });

      return true;
    } catch (error) {
      console.error('Error marking session as auto-paid:', error);
      return false;
    }
  }

  /**
   * Get hours remaining until auto-payment for a session
   */
  static getHoursUntilAutoPayment(sessionId: string): number {
    const completedSessions = JSON.parse(localStorage.getItem('completed_sessions') || '[]');
    const session = completedSessions.find((s: any) => (s.sessionId || s.id) === sessionId);
    
    if (!session || session.paymentConfirmed || session.autoPaid) {
      return 0;
    }

    const completedAt = new Date(session.completedAt);
    const hoursElapsed = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60);
    
    return Math.max(0, 24 - hoursElapsed);
  }

  /**
   * Calculate proportional payment based on actual session time
   */
  static calculateProportionalPayment(
    totalAmount: number,
    actualDuration: number,
    scheduledDuration: number
  ): { earnedAmount: number; percentageCompleted: number } {
    const percentageCompleted = Math.min(100, (actualDuration / scheduledDuration) * 100);
    const earnedAmount = (totalAmount * percentageCompleted) / 100;
    
    return {
      earnedAmount: Number(earnedAmount.toFixed(2)),
      percentageCompleted: Math.round(percentageCompleted)
    };
  }
}

export default PaymentConfirmationService;