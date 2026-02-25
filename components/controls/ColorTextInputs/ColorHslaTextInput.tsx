'use client';

import { useEffect, useRef, useState } from 'react';
import { TextInput } from '@mantine/core';
import { hslaToString } from '@/components/ActivityMap/utils/colorToString';

interface ColorHslaInputProps {
  h: number;
  s: number;
  l: number;
  a: number;
  onChange: (h: number, s: number, l: number, a: number) => void;
}

export function ColorHslaTextInput({ h, s, l, a, onChange }: ColorHslaInputProps) {
  const [inputValue, setInputValue] = useState(() => hslaToString(h, s, l, a));
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setInputValue(hslaToString(h, s, l, a));
    }
  }, [h, s, l, a]);

  const apply = () => {
    isFocused.current = false;
    const match = inputValue.match(
      /hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)/
    );
    if (match) {
      onChange(
        parseFloat(match[1]),
        parseFloat(match[2]),
        parseFloat(match[3]),
        match[4] !== undefined ? parseFloat(match[4]) : 1
      );
    } else {
      setInputValue(hslaToString(h, s, l, a));
    }
  };

  return (
    <TextInput
      value={inputValue}
      onChange={(e) => setInputValue(e.currentTarget.value)}
      onFocus={() => {
        isFocused.current = true;
      }}
      onBlur={apply}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}
