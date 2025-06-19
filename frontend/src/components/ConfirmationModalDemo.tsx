import React, { useState } from 'react';
import ConfirmationModal from './ConfirmationModal';
import AlertModal from './AlertModal';

/**
 * Demo component showing how to use ConfirmationModal
 * This file can be removed after testing - it's just for demonstration
 */
const ConfirmationModalDemo: React.FC = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [showDanger, setShowDanger] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Alert Modal state
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setAlertModal({
      isOpen: true,
      type,
      title,
      message
    });
  };

  const closeAlert = () => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    setShowWarning(false);
    setShowDanger(false);
    setShowInfo(false);
    showAlert('success', 'Success!', 'Action confirmed!');
  };

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold mb-6">ConfirmationModal Demo</h2>
      
      <div className="space-y-3">
        <button
          onClick={() => setShowWarning(true)}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
        >
          Show Warning Modal
        </button>
        
        <button
          onClick={() => setShowDanger(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
        >
          Show Danger Modal
        </button>
        
        <button
          onClick={() => setShowInfo(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Show Info Modal
        </button>
      </div>

      {/* Warning Modal */}
      <ConfirmationModal
        isOpen={showWarning}
        onClose={() => setShowWarning(false)}
        onConfirm={handleConfirm}
        title="Warning"
        message="This action requires your attention. Are you sure you want to proceed?"
        confirmText="Yes, Continue"
        cancelText="Cancel"
        variant="warning"
        isLoading={isLoading}
      />

      {/* Danger Modal */}
      <ConfirmationModal
        isOpen={showDanger}
        onClose={() => setShowDanger(false)}
        onConfirm={handleConfirm}
        title="Dangerous Action"
        message="This action cannot be undone and may result in permanent data loss. Are you absolutely sure?"
        confirmText="Delete Forever"
        cancelText="Keep Safe"
        variant="danger"
        isLoading={isLoading}
      />

      {/* Info Modal */}
      <ConfirmationModal
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        onConfirm={handleConfirm}
        title="Information"
        message="This will update your settings and apply the changes immediately."
        confirmText="Apply Changes"
        cancelText="Cancel"
        variant="info"
        isLoading={isLoading}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
      />
    </div>
  );
};

export default ConfirmationModalDemo;