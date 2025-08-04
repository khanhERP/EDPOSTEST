
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Delete, Space } from 'lucide-react';

interface VirtualKeyboardProps {
  isVisible: boolean;
  onClose: () => void;
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}

export function VirtualKeyboard({
  isVisible,
  onClose,
  onKeyPress,
  onBackspace,
  onClear,
}: VirtualKeyboardProps) {
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  if (!isVisible) return null;

  const numberKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const topRowKeys = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
  const middleRowKeys = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
  const bottomRowKeys = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];
  const specialChars = ['@', '.', '-', '_'];

  const handleKeyPress = (key: string) => {
    let finalKey = key;
    
    if (key.match(/[a-z]/)) {
      if (capsLock || isShiftPressed) {
        finalKey = key.toUpperCase();
      }
    }
    
    onKeyPress(finalKey);
    
    // Reset shift after key press (but not caps lock)
    if (isShiftPressed && !capsLock) {
      setIsShiftPressed(false);
    }
  };

  const handleShift = () => {
    setIsShiftPressed(!isShiftPressed);
  };

  const handleCapsLock = () => {
    setCapsLock(!capsLock);
    setIsShiftPressed(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-gray-300 shadow-lg">
      <div className="p-4 max-w-4xl mx-auto">
        {/* Header with close button */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-gray-700">가상 키보드</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Number row */}
        <div className="flex gap-1 mb-2 justify-center">
          {numberKeys.map((key) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => handleKeyPress(key)}
              className="h-10 w-10 p-0 text-sm"
            >
              {key}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={onBackspace}
            className="h-10 w-12 p-0"
          >
            <Delete className="h-4 w-4" />
          </Button>
        </div>

        {/* Top letter row */}
        <div className="flex gap-1 mb-2 justify-center">
          {topRowKeys.map((key) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => handleKeyPress(key)}
              className="h-10 w-10 p-0 text-sm"
            >
              {capsLock || isShiftPressed ? key.toUpperCase() : key}
            </Button>
          ))}
        </div>

        {/* Middle letter row */}
        <div className="flex gap-1 mb-2 justify-center">
          <Button
            variant={capsLock ? "default" : "outline"}
            size="sm"
            onClick={handleCapsLock}
            className="h-10 w-16 p-0 text-xs"
          >
            CAPS
          </Button>
          {middleRowKeys.map((key) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => handleKeyPress(key)}
              className="h-10 w-10 p-0 text-sm"
            >
              {capsLock || isShiftPressed ? key.toUpperCase() : key}
            </Button>
          ))}
        </div>

        {/* Bottom letter row */}
        <div className="flex gap-1 mb-2 justify-center">
          <Button
            variant={isShiftPressed && !capsLock ? "default" : "outline"}
            size="sm"
            onClick={handleShift}
            className="h-10 w-16 p-0 text-xs"
          >
            SHIFT
          </Button>
          {bottomRowKeys.map((key) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => handleKeyPress(key)}
              className="h-10 w-10 p-0 text-sm"
            >
              {capsLock || isShiftPressed ? key.toUpperCase() : key}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            className="h-10 w-16 p-0 text-xs"
          >
            CLEAR
          </Button>
        </div>

        {/* Special characters and space */}
        <div className="flex gap-1 justify-center">
          {specialChars.map((char) => (
            <Button
              key={char}
              variant="outline"
              size="sm"
              onClick={() => handleKeyPress(char)}
              className="h-10 w-10 p-0 text-sm"
            >
              {char}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleKeyPress(' ')}
            className="h-10 w-32 p-0 text-xs flex items-center justify-center gap-2"
          >
            <Space className="h-4 w-4" />
            SPACE
          </Button>
        </div>
      </div>
    </div>
  );
}
