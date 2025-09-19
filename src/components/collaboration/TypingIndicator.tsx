import React from 'react';
import { Badge } from '@/components/ui/badge';

interface TypingUser {
  userId: string;
  userName: string;
}

interface TypingIndicatorProps {
  typingUsers: (TypingUser | string)[];
  userNames?: Record<string, string>; // Map of userId to userName
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  userNames = {},
  className = ''
}) => {
  if (typingUsers.length === 0) {
    return null;
  }

  // Convert typingUsers to consistent format
  const normalizedUsers = typingUsers.map(user => {
    if (typeof user === 'string') {
      return {
        userId: user,
        userName: userNames[user] || 'Unknown User'
      };
    }
    return user;
  });

  const getTypingText = () => {
    if (normalizedUsers.length === 1) {
      return `${normalizedUsers[0].userName} is typing...`;
    } else if (normalizedUsers.length === 2) {
      return `${normalizedUsers[0].userName} and ${normalizedUsers[1].userName} are typing...`;
    } else if (normalizedUsers.length === 3) {
      return `${normalizedUsers[0].userName}, ${normalizedUsers[1].userName}, and ${normalizedUsers[2].userName} are typing...`;
    } else {
      return `${normalizedUsers[0].userName}, ${normalizedUsers[1].userName}, and ${normalizedUsers.length - 2} others are typing...`;
    }
  };

  return (
    <div className={`typing-indicator-container ${className}`}>
      <div className="flex items-center space-x-2">
        <div className="typing-indicator-dots">
          <div className="typing-indicator-dot" />
          <div className="typing-indicator-dot" />
          <div className="typing-indicator-dot" />
        </div>
        <span className="text-xs font-medium">{getTypingText()}</span>
      </div>
    </div>
  );
};

export default TypingIndicator;