import React, { useState } from 'react';

interface ProfileCardIsolatedProps {
  userAddress: string;
  index: number;
}

const ProfileCardIsolated: React.FC<ProfileCardIsolatedProps> = ({ userAddress, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div 
      style={{
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '16px',
        margin: '8px 0',
        backgroundColor: '#fff',
        minHeight: isExpanded ? '200px' : '80px',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Card {index}</h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{userAddress.slice(0, 8)}...</p>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log(`ISOLATED Card ${index} clicked, current state: ${isExpanded}`);
            setIsExpanded(prev => {
              console.log(`ISOLATED Card ${index} changing from ${prev} to ${!prev}`);
              return !prev;
            });
          }}
          style={{
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: '#f5f5f5',
            cursor: 'pointer'
          }}
        >
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>
      
      <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #eee' }} />
      
      {isExpanded && (
        <div style={{ 
          backgroundColor: '#e8f5e8', 
          padding: '12px', 
          borderRadius: '4px',
          marginTop: '8px'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#2d5a2d' }}>
            ✅ ONLY CARD {index} SHOULD BE EXPANDED!
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
            This is the expanded content for card {index}. If you see this on multiple cards when clicking only one, then there's a CSS issue.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProfileCardIsolated;