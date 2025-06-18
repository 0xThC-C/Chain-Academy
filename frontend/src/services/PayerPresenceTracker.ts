/**
 * PayerPresenceTracker Service
 * 
 * CRITICAL SECURITY FIX: Tracks presence time of the specific wallet address that PAID for the mentorship
 * to ensure fair payments based only on payer's actual presence time, not total session time.
 * 
 * This prevents mentors from receiving 100% payment when students (payers) leave early.
 */

export interface PayerPresenceTracking {
  sessionId: string;
  payerAddress: string; // The wallet address that paid for the session
  mentorAddress: string;
  totalPresenceTime: number; // Cumulative time payer was present (milliseconds)
  sessionStartTime: number; // When session officially started
  payerJoinTimes: number[]; // Array of join timestamps
  payerLeaveTimes: number[]; // Array of leave timestamps
  isPayerCurrentlyPresent: boolean; // Current presence status
  lastPayerActivity: number; // Last join/leave timestamp
  scheduledDuration: number; // Original scheduled session duration (minutes)
  paymentCalculationData: {
    presencePercentage: number; // Percentage of time payer was present
    earnedAmount: number; // Amount mentor should receive based on payer presence
    totalAmount: number; // Original total session amount
  };
}

export interface PayerPresenceEvent {
  type: 'join' | 'leave';
  payerAddress: string;
  sessionId: string;
  timestamp: number;
  metadata?: {
    connectionType?: string;
    userAgent?: string;
    reason?: string; // For leave events: 'manual', 'disconnect', 'timeout', etc.
  };
}

export class PayerPresenceTracker {
  private static instance: PayerPresenceTracker;
  private trackingData: Map<string, PayerPresenceTracking> = new Map();
  private eventListeners: Map<string, ((event: PayerPresenceEvent) => void)[]> = new Map();
  
  // Heartbeat intervals for each session
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly PRESENCE_TIMEOUT = 60000; // 1 minute without heartbeat = considered offline
  
  private constructor() {
    // Initialize with any existing data from localStorage
    this.loadFromStorage();
    
    // Start periodic persistence
    setInterval(() => this.saveToStorage(), 10000); // Save every 10 seconds
  }
  
  public static getInstance(): PayerPresenceTracker {
    if (!PayerPresenceTracker.instance) {
      PayerPresenceTracker.instance = new PayerPresenceTracker();
    }
    return PayerPresenceTracker.instance;
  }
  
  /**
   * Initialize tracking for a new session
   */
  public initializeSession(
    sessionId: string,
    payerAddress: string,
    mentorAddress: string,
    scheduledDuration: number,
    totalAmount: number
  ): PayerPresenceTracking {
    const tracking: PayerPresenceTracking = {
      sessionId,
      payerAddress: payerAddress.toLowerCase(),
      mentorAddress: mentorAddress.toLowerCase(),
      totalPresenceTime: 0,
      sessionStartTime: Date.now(),
      payerJoinTimes: [],
      payerLeaveTimes: [],
      isPayerCurrentlyPresent: false,
      lastPayerActivity: Date.now(),
      scheduledDuration,
      paymentCalculationData: {
        presencePercentage: 0,
        earnedAmount: 0,
        totalAmount
      }
    };
    
    this.trackingData.set(sessionId, tracking);
    this.saveToStorage();
    
    console.log('🎯 PayerPresenceTracker: Session initialized', {
      sessionId,
      payerAddress,
      mentorAddress,
      scheduledDuration,
      totalAmount
    });
    
    return tracking;
  }
  
  /**
   * Record payer joining the session with validation and edge case handling
   */
  public recordPayerJoin(sessionId: string, payerAddress: string, metadata?: any): void {
    const tracking = this.trackingData.get(sessionId);
    if (!tracking) {
      console.error('PayerPresenceTracker: Session not found for join event', sessionId);
      return;
    }
    
    // Verify this is the correct payer
    if (tracking.payerAddress !== payerAddress.toLowerCase()) {
      console.warn('PayerPresenceTracker: Join event from non-payer address', {
        expected: tracking.payerAddress,
        received: payerAddress.toLowerCase()
      });
      return; // Ignore non-payer join events
    }
    
    const now = Date.now();
    
    // EDGE CASE HANDLING: Validate join time against session schedule
    const sessionElapsed = now - tracking.sessionStartTime;
    const scheduledDurationMs = tracking.scheduledDuration * 60 * 1000;
    
    if (sessionElapsed > scheduledDurationMs) {
      console.warn('PayerPresenceTracker: Join attempt after session ended', {
        sessionId,
        payerAddress,
        sessionElapsed: sessionElapsed / 1000 / 60, // minutes
        scheduledDuration: tracking.scheduledDuration
      });
      // Still allow join but log warning
    }
    
    // EDGE CASE: Handle rapid join/leave cycles (potential gaming attempt)
    const recentJoins = tracking.payerJoinTimes.filter(t => (now - t) < 30000); // Last 30 seconds
    if (recentJoins.length >= 3) {
      console.warn('PayerPresenceTracker: Rapid join attempts detected - potential gaming', {
        sessionId,
        payerAddress,
        recentJoins: recentJoins.length
      });
      // Add small delay to prevent rapid cycling
      setTimeout(() => this.recordPayerJoin(sessionId, payerAddress, metadata), 5000);
      return;
    }
    
    // Only record if not already present
    if (!tracking.isPayerCurrentlyPresent) {
      tracking.payerJoinTimes.push(now);
      tracking.isPayerCurrentlyPresent = true;
      tracking.lastPayerActivity = now;
      
      // Start heartbeat monitoring for this payer
      this.startHeartbeatMonitoring(sessionId);
      
      const event: PayerPresenceEvent = {
        type: 'join',
        payerAddress: payerAddress.toLowerCase(),
        sessionId,
        timestamp: now,
        metadata
      };
      
      this.notifyEventListeners(sessionId, event);
      this.updatePaymentCalculation(sessionId);
      this.saveToStorage();
      
      console.log('✅ PayerPresenceTracker: Payer joined', {
        sessionId,
        payerAddress,
        timestamp: new Date(now).toISOString(),
        joinCount: tracking.payerJoinTimes.length
      });
    } else {
      // EDGE CASE: Already present - update heartbeat but don't duplicate join
      tracking.lastPayerActivity = now;
      console.log('⚠️ PayerPresenceTracker: Duplicate join ignored - payer already present', {
        sessionId,
        payerAddress
      });
    }
  }
  
  /**
   * Record payer leaving the session with validation and edge case handling
   */
  public recordPayerLeave(sessionId: string, payerAddress: string, reason?: string, metadata?: any): void {
    const tracking = this.trackingData.get(sessionId);
    if (!tracking) {
      console.error('PayerPresenceTracker: Session not found for leave event', sessionId);
      return;
    }
    
    // Verify this is the correct payer
    if (tracking.payerAddress !== payerAddress.toLowerCase()) {
      console.warn('PayerPresenceTracker: Leave event from non-payer address', {
        expected: tracking.payerAddress,
        received: payerAddress.toLowerCase()
      });
      return; // Ignore non-payer leave events
    }
    
    const now = Date.now();
    
    // EDGE CASE: Handle rapid leave/join cycles (potential gaming attempt)
    const recentLeaves = tracking.payerLeaveTimes.filter(t => (now - t) < 30000); // Last 30 seconds
    if (recentLeaves.length >= 3) {
      console.warn('PayerPresenceTracker: Rapid leave attempts detected - potential gaming', {
        sessionId,
        payerAddress,
        recentLeaves: recentLeaves.length
      });
      // Still process but log warning
    }
    
    // Only record if currently present
    if (tracking.isPayerCurrentlyPresent) {
      tracking.payerLeaveTimes.push(now);
      tracking.isPayerCurrentlyPresent = false;
      tracking.lastPayerActivity = now;
      
      // Calculate and add the time for this presence session
      const lastJoinTime = tracking.payerJoinTimes[tracking.payerJoinTimes.length - 1];
      let sessionTime = 0;
      
      if (lastJoinTime) {
        sessionTime = now - lastJoinTime;
        
        // EDGE CASE VALIDATION: Ensure reasonable session time
        const maxReasonableSessionTime = 4 * 60 * 60 * 1000; // 4 hours max
        if (sessionTime > maxReasonableSessionTime) {
          console.warn('PayerPresenceTracker: Unusually long presence session detected', {
            sessionId,
            payerAddress,
            sessionTime: sessionTime / 1000 / 60, // minutes
            reason: 'possibly missed leave event'
          });
          // Cap the session time to prevent gaming
          sessionTime = Math.min(sessionTime, maxReasonableSessionTime);
        }
        
        // EDGE CASE: Minimum session time to prevent micro-sessions
        const minSessionTime = 10000; // 10 seconds minimum
        if (sessionTime < minSessionTime) {
          console.warn('PayerPresenceTracker: Very short presence session detected', {
            sessionId,
            payerAddress,
            sessionTime: sessionTime / 1000, // seconds
            reason: 'possible connection issue or gaming attempt'
          });
          // Still count it but log warning
        }
        
        tracking.totalPresenceTime += sessionTime;
      } else {
        console.error('PayerPresenceTracker: Leave without corresponding join', {
          sessionId,
          payerAddress,
          joinTimes: tracking.payerJoinTimes.length,
          leaveTimes: tracking.payerLeaveTimes.length
        });
      }
      
      // Stop heartbeat monitoring
      this.stopHeartbeatMonitoring(sessionId);
      
      const event: PayerPresenceEvent = {
        type: 'leave',
        payerAddress: payerAddress.toLowerCase(),
        sessionId,
        timestamp: now,
        metadata: { ...metadata, reason }
      };
      
      this.notifyEventListeners(sessionId, event);
      this.updatePaymentCalculation(sessionId);
      this.saveToStorage();
      
      console.log('❌ PayerPresenceTracker: Payer left', {
        sessionId,
        payerAddress,
        reason,
        sessionTime: sessionTime / 1000 / 60, // minutes
        totalPresenceTime: tracking.totalPresenceTime / 1000 / 60, // minutes
        timestamp: new Date(now).toISOString(),
        leaveCount: tracking.payerLeaveTimes.length
      });
    } else {
      // EDGE CASE: Already not present - log but don't duplicate leave
      console.log('⚠️ PayerPresenceTracker: Duplicate leave ignored - payer already not present', {
        sessionId,
        payerAddress,
        reason
      });
    }
  }
  
  /**
   * Update payer heartbeat (keeps them marked as present)
   */
  public updatePayerHeartbeat(sessionId: string, payerAddress: string): void {
    const tracking = this.trackingData.get(sessionId);
    if (!tracking || tracking.payerAddress !== payerAddress.toLowerCase()) {
      return;
    }
    
    if (tracking.isPayerCurrentlyPresent) {
      tracking.lastPayerActivity = Date.now();
      // No need to save to storage for heartbeats, too frequent
    }
  }
  
  /**
   * Get current tracking data for a session
   */
  public getSessionTracking(sessionId: string): PayerPresenceTracking | null {
    const tracking = this.trackingData.get(sessionId);
    if (!tracking) return null;
    
    // Update current presence time if payer is currently present
    if (tracking.isPayerCurrentlyPresent) {
      const lastJoinTime = tracking.payerJoinTimes[tracking.payerJoinTimes.length - 1];
      if (lastJoinTime) {
        const currentSessionTime = Date.now() - lastJoinTime;
        // Return updated calculation without modifying stored data
        const updatedTracking = { ...tracking };
        updatedTracking.totalPresenceTime = tracking.totalPresenceTime + currentSessionTime;
        this.calculatePaymentData(updatedTracking);
        return updatedTracking;
      }
    }
    
    return tracking;
  }
  
  /**
   * Get real-time payer presence percentage for a session
   */
  public getPayerPresencePercentage(sessionId: string): number {
    const tracking = this.getSessionTracking(sessionId);
    if (!tracking) return 0;
    
    return tracking.paymentCalculationData.presencePercentage;
  }
  
  /**
   * Get earned amount based on payer presence
   */
  public getEarnedAmount(sessionId: string): number {
    const tracking = this.getSessionTracking(sessionId);
    if (!tracking) return 0;
    
    return tracking.paymentCalculationData.earnedAmount;
  }
  
  /**
   * Check if payer is currently present
   */
  public isPayerPresent(sessionId: string, payerAddress: string): boolean {
    const tracking = this.trackingData.get(sessionId);
    if (!tracking || tracking.payerAddress !== payerAddress.toLowerCase()) {
      return false;
    }
    
    return tracking.isPayerCurrentlyPresent;
  }
  
  /**
   * Finalize session and get final payment calculation
   */
  public finalizeSession(sessionId: string): PayerPresenceTracking | null {
    const tracking = this.trackingData.get(sessionId);
    if (!tracking) return null;
    
    // If payer is still marked as present, record final leave time
    if (tracking.isPayerCurrentlyPresent) {
      const now = Date.now();
      tracking.payerLeaveTimes.push(now);
      
      const lastJoinTime = tracking.payerJoinTimes[tracking.payerJoinTimes.length - 1];
      if (lastJoinTime) {
        const sessionTime = now - lastJoinTime;
        tracking.totalPresenceTime += sessionTime;
      }
      
      tracking.isPayerCurrentlyPresent = false;
    }
    
    // Stop heartbeat monitoring
    this.stopHeartbeatMonitoring(sessionId);
    
    // Final payment calculation
    this.updatePaymentCalculation(sessionId);
    this.saveToStorage();
    
    console.log('🏁 PayerPresenceTracker: Session finalized', {
      sessionId,
      totalPresenceTime: tracking.totalPresenceTime / 1000 / 60, // minutes
      presencePercentage: tracking.paymentCalculationData.presencePercentage,
      earnedAmount: tracking.paymentCalculationData.earnedAmount
    });
    
    return tracking;
  }
  
  /**
   * Clean up session data
   */
  public cleanupSession(sessionId: string): void {
    this.stopHeartbeatMonitoring(sessionId);
    this.trackingData.delete(sessionId);
    this.eventListeners.delete(sessionId);
    this.saveToStorage();
    
    console.log('🧹 PayerPresenceTracker: Session cleaned up', sessionId);
  }
  
  /**
   * Add event listener for presence events
   */
  public addEventListener(sessionId: string, listener: (event: PayerPresenceEvent) => void): void {
    if (!this.eventListeners.has(sessionId)) {
      this.eventListeners.set(sessionId, []);
    }
    this.eventListeners.get(sessionId)!.push(listener);
  }
  
  /**
   * Remove event listener
   */
  public removeEventListener(sessionId: string, listener: (event: PayerPresenceEvent) => void): void {
    const listeners = this.eventListeners.get(sessionId);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  /**
   * Validate session data integrity and detect anomalies
   */
  public validateSessionData(sessionId: string): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
    recommendations: string[];
  } {
    const tracking = this.trackingData.get(sessionId);
    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendations: string[] = [];
    
    if (!tracking) {
      errors.push('Session not found');
      return { isValid: false, warnings, errors, recommendations };
    }
    
    // Check join/leave balance
    const joinCount = tracking.payerJoinTimes.length;
    const leaveCount = tracking.payerLeaveTimes.length;
    
    if (tracking.isPayerCurrentlyPresent && joinCount !== leaveCount + 1) {
      warnings.push(`Unbalanced join/leave events: ${joinCount} joins, ${leaveCount} leaves (currently present)`);
    } else if (!tracking.isPayerCurrentlyPresent && joinCount !== leaveCount) {
      warnings.push(`Unbalanced join/leave events: ${joinCount} joins, ${leaveCount} leaves (currently not present)`);
    }
    
    // Check for excessive join/leave cycles
    if (joinCount > 10) {
      warnings.push(`Excessive join events: ${joinCount} (possible connection issues or gaming attempt)`);
      recommendations.push('Review connection stability or investigate potential gaming');
    }
    
    // Check presence time vs session time
    const totalSessionTime = Date.now() - tracking.sessionStartTime;
    const presenceRatio = tracking.totalPresenceTime / totalSessionTime;
    
    if (presenceRatio > 1.1) {
      errors.push(`Invalid presence time: ${(presenceRatio * 100).toFixed(1)}% of total session time`);
    } else if (presenceRatio > 1.0) {
      warnings.push(`Presence time slightly exceeds session time: ${(presenceRatio * 100).toFixed(1)}%`);
    }
    
    // Check for very short presence sessions
    const avgSessionLength = tracking.totalPresenceTime / Math.max(1, leaveCount);
    if (avgSessionLength < 30000 && leaveCount > 3) { // Less than 30 seconds average
      warnings.push(`Very short average presence sessions: ${(avgSessionLength / 1000).toFixed(1)}s`);
      recommendations.push('Investigate frequent disconnections or potential gaming');
    }
    
    // Check heartbeat timing
    const timeSinceLastActivity = Date.now() - tracking.lastPayerActivity;
    if (tracking.isPayerCurrentlyPresent && timeSinceLastActivity > this.PRESENCE_TIMEOUT) {
      warnings.push(`No recent activity: ${(timeSinceLastActivity / 1000 / 60).toFixed(1)} minutes since last heartbeat`);
      recommendations.push('Consider marking payer as inactive');
    }
    
    const isValid = errors.length === 0;
    return { isValid, warnings, errors, recommendations };
  }
  
  /**
   * Auto-correct common data issues
   */
  public autoCorrectSessionData(sessionId: string): boolean {
    const tracking = this.trackingData.get(sessionId);
    if (!tracking) return false;
    
    let correctionsMade = false;
    
    // Auto-correct: If payer is marked as present but no recent activity, mark as left
    const timeSinceLastActivity = Date.now() - tracking.lastPayerActivity;
    if (tracking.isPayerCurrentlyPresent && timeSinceLastActivity > this.PRESENCE_TIMEOUT * 2) {
      console.log('🔧 PayerPresenceTracker: Auto-correcting stale presence status', {
        sessionId,
        timeSinceLastActivity: timeSinceLastActivity / 1000 / 60 // minutes
      });
      
      this.recordPayerLeave(sessionId, tracking.payerAddress, 'auto_correction_timeout');
      correctionsMade = true;
    }
    
    // Auto-correct: Remove duplicate consecutive join/leave events
    const uniqueJoinTimes = [...new Set(tracking.payerJoinTimes)];
    const uniqueLeaveTimes = [...new Set(tracking.payerLeaveTimes)];
    
    if (uniqueJoinTimes.length !== tracking.payerJoinTimes.length) {
      console.log('🔧 PayerPresenceTracker: Removing duplicate join times', {
        sessionId,
        before: tracking.payerJoinTimes.length,
        after: uniqueJoinTimes.length
      });
      tracking.payerJoinTimes = uniqueJoinTimes;
      correctionsMade = true;
    }
    
    if (uniqueLeaveTimes.length !== tracking.payerLeaveTimes.length) {
      console.log('🔧 PayerPresenceTracker: Removing duplicate leave times', {
        sessionId,
        before: tracking.payerLeaveTimes.length,
        after: uniqueLeaveTimes.length
      });
      tracking.payerLeaveTimes = uniqueLeaveTimes;
      correctionsMade = true;
    }
    
    if (correctionsMade) {
      this.updatePaymentCalculation(sessionId);
      this.saveToStorage();
    }
    
    return correctionsMade;
  }
  
  /**
   * Get summary statistics for debugging with validation
   */
  public getSessionSummary(sessionId: string): any {
    const tracking = this.getSessionTracking(sessionId);
    if (!tracking) return null;
    
    const totalSessionTime = Date.now() - tracking.sessionStartTime;
    const joinCount = tracking.payerJoinTimes.length;
    const leaveCount = tracking.payerLeaveTimes.length;
    const validation = this.validateSessionData(sessionId);
    
    return {
      sessionId,
      payerAddress: tracking.payerAddress,
      mentorAddress: tracking.mentorAddress,
      totalSessionTime: totalSessionTime / 1000 / 60, // minutes
      totalPresenceTime: tracking.totalPresenceTime / 1000 / 60, // minutes
      currentlyPresent: tracking.isPayerCurrentlyPresent,
      joinCount,
      leaveCount,
      presencePercentage: tracking.paymentCalculationData.presencePercentage,
      earnedAmount: tracking.paymentCalculationData.earnedAmount,
      totalAmount: tracking.paymentCalculationData.totalAmount,
      scheduledDuration: tracking.scheduledDuration,
      joinTimes: tracking.payerJoinTimes.map(t => new Date(t).toISOString()),
      leaveTimes: tracking.payerLeaveTimes.map(t => new Date(t).toISOString()),
      validation,
      avgPresenceSessionLength: tracking.totalPresenceTime / Math.max(1, leaveCount) / 1000, // seconds
      presenceRatio: tracking.totalPresenceTime / totalSessionTime
    };
  }
  
  // Private methods
  
  private updatePaymentCalculation(sessionId: string): void {
    const tracking = this.trackingData.get(sessionId);
    if (!tracking) return;
    
    this.calculatePaymentData(tracking);
  }
  
  private calculatePaymentData(tracking: PayerPresenceTracking): void {
    const scheduledDurationMs = tracking.scheduledDuration * 60 * 1000; // Convert to milliseconds
    const presencePercentage = Math.min(100, (tracking.totalPresenceTime / scheduledDurationMs) * 100);
    const earnedAmount = (tracking.paymentCalculationData.totalAmount * presencePercentage) / 100;
    
    tracking.paymentCalculationData = {
      presencePercentage: Math.round(presencePercentage * 100) / 100, // Round to 2 decimal places
      earnedAmount: Math.round(earnedAmount * 100) / 100, // Round to 2 decimal places
      totalAmount: tracking.paymentCalculationData.totalAmount
    };
  }
  
  private startHeartbeatMonitoring(sessionId: string): void {
    this.stopHeartbeatMonitoring(sessionId); // Clear any existing interval
    
    const interval = setInterval(() => {
      const tracking = this.trackingData.get(sessionId);
      if (!tracking) {
        this.stopHeartbeatMonitoring(sessionId);
        return;
      }
      
      // Check if payer has been inactive for too long
      const now = Date.now();
      if (tracking.isPayerCurrentlyPresent && (now - tracking.lastPayerActivity) > this.PRESENCE_TIMEOUT) {
        console.warn('⚠️ PayerPresenceTracker: Payer timeout detected, marking as left', {
          sessionId,
          payerAddress: tracking.payerAddress,
          lastActivity: new Date(tracking.lastPayerActivity).toISOString()
        });
        
        this.recordPayerLeave(sessionId, tracking.payerAddress, 'timeout');
      }
    }, this.HEARTBEAT_INTERVAL);
    
    this.heartbeatIntervals.set(sessionId, interval);
  }
  
  private stopHeartbeatMonitoring(sessionId: string): void {
    const interval = this.heartbeatIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(sessionId);
    }
  }
  
  private notifyEventListeners(sessionId: string, event: PayerPresenceEvent): void {
    const listeners = this.eventListeners.get(sessionId);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('PayerPresenceTracker: Error in event listener', error);
        }
      });
    }
  }
  
  private saveToStorage(): void {
    try {
      const data = Array.from(this.trackingData.entries());
      localStorage.setItem('payer_presence_tracking', JSON.stringify(data));
    } catch (error) {
      console.error('PayerPresenceTracker: Failed to save to storage', error);
    }
  }
  
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('payer_presence_tracking');
      if (data) {
        const entries = JSON.parse(data);
        this.trackingData = new Map(entries);
        
        // Restart heartbeat monitoring for active sessions
        this.trackingData.forEach((tracking, sessionId) => {
          if (tracking.isPayerCurrentlyPresent) {
            this.startHeartbeatMonitoring(sessionId);
          }
        });
      }
    } catch (error) {
      console.error('PayerPresenceTracker: Failed to load from storage', error);
      this.trackingData.clear();
    }
  }
}

// Export singleton instance
export const payerPresenceTracker = PayerPresenceTracker.getInstance();