import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

interface SessionPayment {
  sessionId: string;
  studentName: string;
  sessionTitle: string;
  totalAmount: number;
  earnedAmount: number;
  sessionDuration: number; // in minutes
  actualDuration: number; // actual time spent
  // PAYER PRESENCE TRACKING - CRITICAL SECURITY FIX
  payerPresenceTime: number; // actual time payer was present (minutes)
  payerPresencePercentage: number; // percentage based on payer presence
  percentageCompleted: number;
  scheduledDate: string;
  canConfirm: boolean;
  autoPaymentIn: number; // hours until auto-payment
  status: 'pending' | 'confirmed' | 'auto_paid';
  // Payment calculation method
  paymentMethod: 'payer_presence' | 'session_time' | 'legacy';
}

interface MentorPaymentConfirmationProps {
  onPaymentConfirmed?: (sessionId: string) => void;
}

const MentorPaymentConfirmation: React.FC<MentorPaymentConfirmationProps> = ({
  onPaymentConfirmed
}) => {
  const { address } = useAccount();
  const [pendingPayments, setPendingPayments] = useState<SessionPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  // Load pending payments for mentor
  useEffect(() => {
    if (!address) return;

    const loadPendingPayments = () => {
      // Get completed sessions that haven't been manually confirmed
      const completedSessions = JSON.parse(localStorage.getItem('completed_sessions') || '[]');
      const mentorSessions = completedSessions.filter((session: any) => 
        session.mentorAddress?.toLowerCase() === address.toLowerCase() &&
        session.status === 'completed' &&
        !session.paymentConfirmed &&
        !session.autoPaid
      );

      const payments: SessionPayment[] = mentorSessions.map((session: any) => {
        const now = new Date();
        const completedTime = new Date(session.completedAt);
        const hoursElapsed = (now.getTime() - completedTime.getTime()) / (1000 * 60 * 60);
        const autoPaymentIn = Math.max(0, 24 - hoursElapsed);

        // PAYER PRESENCE TRACKING - Calculate payment based on payer presence time
        const totalAmount = session.totalAmount || session.priceUSDC;
        const sessionDuration = session.sessionDuration || 60; // default 60 minutes
        
        // Check if payer presence data is available (new security fix)
        const payerPresenceTime = session.payerPresenceTime || 0; // Time payer was actually present
        const payerPresencePercentage = session.payerPresencePercentage || 0;
        const hasPayerPresenceData = session.paymentMethod === 'payer_presence' && payerPresenceTime > 0;
        
        // Use payer presence time if available, otherwise fallback to legacy calculation
        let actualDuration, percentageCompleted, earnedAmount, paymentMethod;
        
        if (hasPayerPresenceData) {
          // CRITICAL SECURITY FIX: Use payer presence time for payment calculation
          actualDuration = payerPresenceTime;
          percentageCompleted = payerPresencePercentage;
          earnedAmount = (totalAmount * payerPresencePercentage) / 100;
          paymentMethod = 'payer_presence' as const;
          console.log('💰 Using payer presence calculation', {
            sessionId: session.sessionId,
            payerPresenceTime,
            payerPresencePercentage,
            earnedAmount
          });
        } else {
          // Legacy calculation for backward compatibility
          actualDuration = session.actualDuration || sessionDuration;
          percentageCompleted = Math.min(100, (actualDuration / sessionDuration) * 100);
          earnedAmount = (totalAmount * percentageCompleted) / 100;
          paymentMethod = session.actualDuration ? 'session_time' : 'legacy';
          console.warn('⚠️ Using legacy payment calculation - payer presence data not available', {
            sessionId: session.sessionId,
            actualDuration,
            percentageCompleted,
            earnedAmount
          });
        }

        return {
          sessionId: session.sessionId || session.id,
          studentName: session.studentName || 'Student',
          sessionTitle: session.title || session.mentorshipTitle || 'Mentorship Session',
          totalAmount,
          earnedAmount,
          sessionDuration,
          actualDuration,
          // PAYER PRESENCE TRACKING fields
          payerPresenceTime: hasPayerPresenceData ? payerPresenceTime : actualDuration,
          payerPresencePercentage: hasPayerPresenceData ? payerPresencePercentage : percentageCompleted,
          percentageCompleted: Math.round(percentageCompleted),
          scheduledDate: session.scheduledDate || session.date,
          canConfirm: true,
          autoPaymentIn: Math.round(autoPaymentIn),
          status: 'pending',
          paymentMethod
        };
      });

      setPendingPayments(payments);
    };

    loadPendingPayments();
    
    // Refresh every minute to update auto-payment countdown
    const interval = setInterval(loadPendingPayments, 60000);
    return () => clearInterval(interval);
  }, [address]);

  const confirmPayment = async (sessionId: string) => {
    setIsLoading(true);
    setSelectedSession(sessionId);

    try {
      // Find the session payment
      const payment = pendingPayments.find(p => p.sessionId === sessionId);
      if (!payment) return;

      // Update session status to confirmed
      const completedSessions = JSON.parse(localStorage.getItem('completed_sessions') || '[]');
      const updatedSessions = completedSessions.map((session: any) => {
        if ((session.sessionId || session.id) === sessionId) {
          return {
            ...session,
            paymentConfirmed: true,
            paymentConfirmedAt: new Date().toISOString(),
            paymentMethod: 'manual',
            earnedAmount: payment.earnedAmount,
            percentageCompleted: payment.percentageCompleted
          };
        }
        return session;
      });

      localStorage.setItem('completed_sessions', JSON.stringify(updatedSessions));

      // Add to mentor earnings
      const mentorKey = `mentor_earnings_${address}`;
      const currentEarnings = JSON.parse(localStorage.getItem(mentorKey) || '[]');
      currentEarnings.push({
        sessionId,
        amount: payment.earnedAmount,
        confirmedAt: new Date().toISOString(),
        method: 'manual',
        sessionTitle: payment.sessionTitle,
        studentName: payment.studentName,
        percentageCompleted: payment.percentageCompleted
      });
      localStorage.setItem(mentorKey, JSON.stringify(currentEarnings));

      // Remove from pending payments
      setPendingPayments(prev => prev.filter(p => p.sessionId !== sessionId));

      // Notify parent component
      onPaymentConfirmed?.(sessionId);

      console.log('✅ Payment confirmed manually:', {
        sessionId,
        amount: payment.earnedAmount,
        percentage: payment.percentageCompleted
      });

    } catch (error) {
      console.error('Error confirming payment:', error);
    } finally {
      setIsLoading(false);
      setSelectedSession(null);
    }
  };

  if (pendingPayments.length === 0) {
    return (
      <div className="card p-6 text-center">
        <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          All Payments Confirmed
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          No pending payments to confirm.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Confirm Payments
        </h2>
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <ClockIcon className="h-4 w-4" />
          <span>{pendingPayments.length} pending</span>
        </div>
      </div>

      {/* Auto-payment Warning */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800 dark:text-yellow-300">
              Automatic Payment Reminder
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
              Payments not confirmed manually will be automatically processed after 24 hours.
              Please confirm each payment to ensure accuracy.
            </p>
          </div>
        </div>
      </div>

      {/* PAYER PRESENCE TRACKING - Security Improvement Notice */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
            <span className="text-white text-xs">🔒</span>
          </div>
          <div>
            <h4 className="font-medium text-green-800 dark:text-green-300">
              Enhanced Payment Security
            </h4>
            <p className="text-sm text-green-700 dark:text-green-400 mt-1">
              New sessions now use <strong>Payer Presence Tracking</strong> for fair payments. 
              You only receive payment for time when the student (payer) was actually present in the session.
              This ensures fair compensation based on actual mentorship time provided.
            </p>
            <div className="mt-2 text-xs text-green-600 dark:text-green-500">
              ✓ Secure payment calculation based on payer attendance<br/>
              ✓ Protection against unfair payment claims<br/>
              ✓ Transparent time tracking for both parties
            </div>
          </div>
        </div>
      </div>

      {/* Pending Payments List */}
      <div className="space-y-4">
        {pendingPayments.map((payment) => (
          <div key={payment.sessionId} className="card p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {payment.sessionTitle}
                  </h3>
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs rounded-full">
                    Pending Confirmation
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Student</p>
                    <p className="font-medium text-gray-900 dark:text-white">{payment.studentName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {payment.paymentMethod === 'payer_presence' ? 'Payer Presence Time' : 'Session Duration'}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {payment.paymentMethod === 'payer_presence' ? (
                        <>
                          {Math.round(payment.payerPresenceTime)}min / {payment.sessionDuration}min
                          <span className="ml-1 text-xs text-green-600 dark:text-green-400">🔒 Secure</span>
                        </>
                      ) : (
                        <>
                          {payment.actualDuration}min / {payment.sessionDuration}min
                          <span className="ml-1 text-xs text-yellow-600 dark:text-yellow-400">⚠️ Legacy</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {payment.paymentMethod === 'payer_presence' ? 'Payer Presence' : 'Completion'}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {payment.paymentMethod === 'payer_presence' ? (
                        <>
                          {payment.payerPresencePercentage.toFixed(1)}%
                          <span className="ml-1 text-xs text-green-600 dark:text-green-400">Tracked</span>
                        </>
                      ) : (
                        `${payment.percentageCompleted}%`
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Auto-payment In</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {payment.autoPaymentIn > 0 ? `${payment.autoPaymentIn}h` : 'Processing...'}
                    </p>
                  </div>
                </div>

                {/* Payment Amount Breakdown */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                  {/* Payment Method Indicator */}
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Calculation:</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      payment.paymentMethod === 'payer_presence' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {payment.paymentMethod === 'payer_presence' ? '🔒 Payer Presence Tracking' : '⚠️ Legacy Calculation'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Full Session Amount:</span>
                    <span className="font-medium text-gray-900 dark:text-white">${payment.totalAmount.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {payment.paymentMethod === 'payer_presence' ? (
                        <>Earned Amount (Payer: {payment.payerPresencePercentage.toFixed(1)}%):</>
                      ) : (
                        <>Earned Amount ({payment.percentageCompleted}%):</>
                      )}
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      ${payment.earnedAmount.toFixed(2)}
                    </span>
                  </div>
                  
                  {payment.paymentMethod === 'payer_presence' && (
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        Based on payer presence: {Math.round(payment.payerPresenceTime)}min of {payment.sessionDuration}min
                      </span>
                      <span className="text-green-600 dark:text-green-400 font-medium">✓ Secure</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Platform fee (10%):</span>
                    <span>${(payment.earnedAmount * 0.1).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between font-medium text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                    <span>You receive:</span>
                    <span>${(payment.earnedAmount * 0.9).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="ml-6">
                <button
                  onClick={() => confirmPayment(payment.sessionId)}
                  disabled={isLoading && selectedSession === payment.sessionId}
                  className="btn-primary flex items-center space-x-2"
                >
                  {isLoading && selectedSession === payment.sessionId ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <CurrencyDollarIcon className="h-4 w-4" />
                      <span>Confirm Payment</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MentorPaymentConfirmation;