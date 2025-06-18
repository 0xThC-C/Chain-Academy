import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import SimpleSessionRoom from '../components/SimpleSessionRoom';
import WalletConnectionV2 from '../components/WalletConnectionV2';
import { useTheme } from '../contexts/ThemeContext';
import { safeNavigate } from '../utils/navigation';

const SessionPageBypass: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { isDarkMode } = useTheme();
  const { address, isConnected } = useAccount();

  const handleLeaveSession = () => {
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

  return (
    <SimpleSessionRoom
      sessionId={sessionId}
      userAddress={address || ''}
      onLeave={handleLeaveSession}
    />
  );
};

export default SessionPageBypass;