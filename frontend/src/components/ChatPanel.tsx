import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { sanitizeFormInput, createSafeHTML } from '../utils/sanitization';

interface ChatMessage {
  id: string;
  roomId: string;
  from: string;
  message: string;
  timestamp: Date;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  currentUser: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, currentUser }) => {
  const { isDarkMode } = useTheme();
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp: Date): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🔒 SECURITY: Sanitize user input to prevent XSS attacks
    const sanitizedMessage = sanitizeFormInput(inputMessage.trim(), 500);
    
    if (sanitizedMessage && sanitizedMessage.length > 0) {
      onSendMessage(sanitizedMessage);
      setInputMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const isOwnMessage = (message: ChatMessage): boolean => {
    return message.from === currentUser;
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Chat Header */}
      <div className={`p-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>
          Chat
        </h3>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {messages.length} {messages.length !== 1 ? 'messages' : 'message'}
        </p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No messages yet. Start the conversation!
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                isOwnMessage(message)
                  ? 'bg-red-500 text-white'
                  : isDarkMode
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-black border border-gray-200'
              }`}>
                {/* Message Header */}
                {!isOwnMessage(message) && (
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {formatAddress(message.from)}
                    </span>
                    <span className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                )}
                
                {/* Message Content - XSS Protected */}
                <div 
                  className="break-words whitespace-pre-wrap"
                  dangerouslySetInnerHTML={createSafeHTML(message.message, 'chat')}
                />
                
                {/* Own Message Timestamp */}
                {isOwnMessage(message) && (
                  <div className="text-right mt-1">
                    <span className="text-xs text-red-200">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className={`p-4 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            maxLength={500}
            className={`flex-1 px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-red-500 ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-black placeholder-gray-500'
            }`}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className={`px-4 py-2 rounded-lg transition-colors ${
              inputMessage.trim()
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : isDarkMode
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </form>
        
        {/* Character Count */}
        <div className="flex justify-between items-center mt-2">
          <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Press Enter to send, Shift+Enter for new line
          </div>
          <div className={`text-xs ${
            inputMessage.length > 450 
              ? 'text-red-500' 
              : isDarkMode 
              ? 'text-gray-400' 
              : 'text-gray-500'
          }`}>
            {inputMessage.length}/500
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;