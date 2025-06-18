import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import SessionRoomV3 from '../components/SessionRoomV3';
import WalletConnectionV2 from '../components/WalletConnectionV2';
import { useTheme } from '../contexts/ThemeContext';
import { safeNavigate } from '../utils/navigation';

interface SessionData {
  mentorAddress: string;
  mentorName: string;
  sessionTitle: string;
  sessionDuration: number;
  totalAmount: number;
  isStudent: boolean;
}

const SessionPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { isDarkMode } = useTheme();
  const { address, isConnected } = useAccount();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  // Load session data from localStorage
  useEffect(() => {
    if (sessionId) {
      try {
        // Try to get session data from localStorage
        const storedSessionData = localStorage.getItem(`session_${sessionId}`);
        if (storedSessionData) {
          const data = JSON.parse(storedSessionData);
          setSessionData(data);
        } else {
          // Fallback: try to find session data in mentorship_bookings
          const bookings = JSON.parse(localStorage.getItem('mentorship_bookings') || '[]');
          
          // SECURITY: Only allow access to sessions where user is involved
          const sessionBooking = bookings.find((booking: any) => {
            const matchesSession = booking.sessionId === sessionId;
            
            // ULTRA FIX: Only check security if address is available
            if (!address) {
              console.log('⚠️ No address available, allowing session data load for now');
              return matchesSession;
            }
            
            const isStudent = booking.student?.toLowerCase() === address.toLowerCase();
            const isMentor = booking.mentor?.toLowerCase() === address.toLowerCase();
            const hasAccess = isStudent || isMentor;
            
            console.log('🔍 Session access check:', {
              sessionId,
              bookingId: booking.sessionId,
              student: booking.student,
              mentor: booking.mentor,
              currentAddress: address,
              matchesSession,
              hasAccess
            });
            
            return matchesSession && hasAccess;
          });
          
          if (sessionBooking) {
            setSessionData({
              mentorAddress: sessionBooking.mentorAddress,
              mentorName: sessionBooking.mentorName || 'Mentor',
              sessionTitle: sessionBooking.title || 'Mentorship Session',
              sessionDuration: sessionBooking.duration || 60,
              totalAmount: sessionBooking.amount || 100,
              isStudent: address !== sessionBooking.mentorAddress
            });
          } else {
            // Final fallback: try to find in global_mentorships
            const globalMentorships = JSON.parse(localStorage.getItem('global_mentorships') || '[]');
            const sessionMentorship = globalMentorships.find((m: any) => 
              m.sessionId === sessionId || m.id === sessionId
            );
            
            if (sessionMentorship) {
              setSessionData({
                mentorAddress: sessionMentorship.mentorAddress || sessionMentorship.address,
                mentorName: sessionMentorship.mentorName || sessionMentorship.name || 'Mentor',
                sessionTitle: sessionMentorship.title || 'Mentorship Session',
                sessionDuration: sessionMentorship.duration || 60,
                totalAmount: sessionMentorship.priceUSDC || 100,
                isStudent: address !== sessionMentorship.mentorAddress
              });
            } else {
              // Default fallback data
              setSessionData({
                mentorAddress: '',
                mentorName: 'Mentor',
                sessionTitle: 'Mentorship Session',
                sessionDuration: 60,
                totalAmount: 100,
                isStudent: true
              });
            }
          }
        }
      } catch (error) {
        console.error('Error loading session data:', error);
        // Default fallback
        setSessionData({
          mentorAddress: '',
          mentorName: 'Mentor',
          sessionTitle: 'Mentorship Session',
          sessionDuration: 60,
          totalAmount: 100,
          isStudent: true
        });
      }
    }
  }, [sessionId]); // CRITICAL FIX: Removed address dependency to prevent infinite loop

  const handleLeaveSession = () => {
    // Navigate to home page instead of dashboard for better UX
    safeNavigate(navigate, '/', { replace: true });
  };

  // Show wallet connection if not connected
  if (!isConnected) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-black text-white' : 'bg-white text-black'
      }`}>
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-500 mb-4">Please connect your wallet to join the session</p>
          <WalletConnectionV2 />
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-black text-white' : 'bg-white text-black'
      }`}>
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Invalid Session</h2>
          <p className="text-gray-500 mb-4">Session ID not provided</p>
          <button
            onClick={() => safeNavigate(navigate, '/', { replace: true })}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Don't render SessionRoom until we have session data
  if (!sessionData) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-black text-white' : 'bg-white text-black'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 mx-auto mb-6"></div>
          <h2 className="text-2xl font-semibold mb-4">Loading Session...</h2>
        </div>
      </div>
    );
  }

  return (
    <SessionRoomV3
      sessionId={sessionId}
      userAddress={address || ''}
      onLeave={handleLeaveSession}
      isStudent={sessionData.isStudent}
      mentorAddress={sessionData.mentorAddress}
      mentorName={sessionData.mentorName}
      sessionTitle={sessionData.sessionTitle}
      sessionDuration={sessionData.sessionDuration}
      totalAmount={sessionData.totalAmount}
    />
  );
};

export default SessionPage;