import { useRef, useState, useEffect } from 'react';

interface DropdownPosition {
  top: number;
  left?: number;
  right?: number;
}

export const useDropdownPosition = (isOpen: boolean, alignment: 'left' | 'right' = 'right') => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<DropdownPosition>({ top: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      
      if (alignment === 'right') {
        setPosition({
          top: rect.bottom + scrollY + 8, // 8px gap
          right: window.innerWidth - rect.right,
          left: undefined,
        });
      } else {
        setPosition({
          top: rect.bottom + scrollY + 8,
          left: rect.left,
          right: undefined,
        });
      }
    }
  }, [isOpen, alignment]);

  return { buttonRef, position };
};