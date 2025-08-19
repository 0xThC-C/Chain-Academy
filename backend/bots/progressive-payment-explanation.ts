/**
 * Progressive Payment Logic Explanation
 * 
 * This demonstrates how V7 contracts handle partial payments
 */

// Example session data from V7 contract
const sessionExample = {
  sessionId: '0x123...',
  totalAmount: BigInt('100000000'), // 100 USDC (6 decimals)
  sessionDuration: 60, // 60 minutes scheduled
  startTime: 1693123200, // Unix timestamp when started
  pausedTime: 300, // 5 minutes paused (in seconds)
  status: 3, // COMPLETED
  isActive: true,
  surveyCompleted: false // Student hasn't confirmed yet
};

// How bot calculates payment:
function calculateProgressivePayment(session: any): { mentorAmount: bigint, refundAmount: bigint, percentage: number } {
  const now = Math.floor(Date.now() / 1000);
  const sessionEndTime = session.startTime + (session.sessionDuration * 60);
  
  // Actual time used (excluding pauses)
  const totalElapsed = Math.min(now - session.startTime, session.sessionDuration * 60);
  const activeTime = totalElapsed - session.pausedTime;
  
  // Calculate percentage completed
  const percentage = Math.min(100, (activeTime / (session.sessionDuration * 60)) * 100);
  
  // Calculate amounts
  const mentorAmount = (session.totalAmount * BigInt(Math.round(percentage))) / BigInt(100);
  const refundAmount = session.totalAmount - mentorAmount;
  
  return {
    mentorAmount,
    refundAmount, 
    percentage: Math.round(percentage)
  };
}

// Real examples:

// Example 1: Full session completed
const fullSession = {
  ...sessionExample,
  // No early end, no excessive pauses
  pausedTime: 0
};
console.log('Full Session:', calculateProgressivePayment(fullSession));
// Result: mentor gets 100%, student gets 0% refund

// Example 2: Half session used  
const halfSession = {
  ...sessionExample,
  sessionDuration: 60,
  // Session ended after 30 minutes
  startTime: Math.floor(Date.now() / 1000) - (30 * 60),
  pausedTime: 0
};
console.log('Half Session:', calculateProgressivePayment(halfSession));
// Result: mentor gets ~50%, student gets ~50% refund

// Example 3: Session with breaks
const pausedSession = {
  ...sessionExample,
  sessionDuration: 60,
  pausedTime: 600, // 10 minutes paused
  startTime: Math.floor(Date.now() / 1000) - (60 * 60) // Full hour elapsed
};
console.log('Paused Session:', calculateProgressivePayment(pausedSession));
// Result: mentor gets ~83% (50min/60min), student gets ~17% refund

export { calculateProgressivePayment };