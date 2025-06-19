import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface ProfileCardTestProps {
  userAddress: string;
  index: number;
}

const ProfileCardTest: React.FC<ProfileCardTestProps> = ({ userAddress, index }) => {
  const { isDarkMode } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Generate unique ID for this card
  const cardId = `card-test-${index}`;
  
  return (
    <div 
      id={cardId}
      className={`rounded-lg border p-4 ${
        isDarkMode ? 'bg-black border-gray-700' : 'bg-white border-gray-200'
      }`}
      style={{
        minHeight: isExpanded ? '300px' : '100px',
        transition: 'min-height 0.2s ease-in-out'
      }}
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="font-bold">Card {index}</p>
          <p className="text-sm">{userAddress.slice(0, 8)}...</p>
        </div>
        <button
          onClick={() => {
            console.log(`Card ${index} clicked, current state: ${isExpanded}`);
            setIsExpanded(!isExpanded);
          }}
          className="p-2 hover:bg-gray-100 rounded"
        >
          {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </button>
      </div>
      
      <div className={`border-t mt-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} />
      
      {isExpanded && (
        <div className="mt-4">
          <p className="text-green-500 font-bold">THIS CARD ({index}) IS EXPANDED!</p>
          <p>Extra content for card {index}</p>
          <p>More content here...</p>
        </div>
      )}
    </div>
  );
};

export default ProfileCardTest;