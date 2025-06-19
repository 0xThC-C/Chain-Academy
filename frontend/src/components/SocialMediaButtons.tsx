import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

// Custom X (Twitter) Icon Component
const XIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

// Custom Discord Icon Component
const DiscordIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0002 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9554 2.4189-2.1568 2.4189Z"/>
  </svg>
);

interface SocialMediaButtonsProps {
  twitterUrl?: string;
  discordUrl?: string;
}

const SocialMediaButtons: React.FC<SocialMediaButtonsProps> = ({
  twitterUrl = '#', // Placeholder until real URL is provided
  discordUrl = '#'  // Placeholder until real URL is provided
}) => {
  const { isDarkMode } = useTheme();

  const handleSocialClick = (url: string, platform: string) => {
    if (url === '#') {
      console.log(`${platform} URL not configured yet`);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-30">
      {/* X (Twitter) Button */}
      <button
        onClick={() => handleSocialClick(twitterUrl, 'X (Twitter)')}
        className={`
          w-14 h-14 rounded-full flex items-center justify-center
          transition-all duration-300 ease-in-out
          shadow-lg hover:shadow-xl
          ${isDarkMode 
            ? 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-600' 
            : 'bg-white text-black hover:bg-gray-50 border border-gray-200'
          }
          hover:scale-110 hover:-translate-y-1
          group
        `}
        title="Follow us on X (Twitter)"
        aria-label="Follow Chain Academy on X (Twitter)"
      >
        <XIcon className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
      </button>

      {/* Discord Button */}
      <button
        onClick={() => handleSocialClick(discordUrl, 'Discord')}
        className={`
          w-14 h-14 rounded-full flex items-center justify-center
          transition-all duration-300 ease-in-out
          shadow-lg hover:shadow-xl
          ${isDarkMode 
            ? 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-600' 
            : 'bg-white text-black hover:bg-gray-50 border border-gray-200'
          }
          hover:scale-110 hover:-translate-y-1
          group
        `}
        title="Join our Discord community"
        aria-label="Join Chain Academy Discord community"
      >
        <DiscordIcon className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
      </button>
    </div>
  );
};

export default SocialMediaButtons;