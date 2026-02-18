import { useEffect, useRef, useState } from 'react';
import { TextInput } from '@mantine/core';
import { RGBA } from '@/components/ActivityMap/mapTypes';
import { parseColorToRgba } from '@/components/ActivityMap/utils/parseColorToRgba';
import { rgbaToString } from '@/components/ActivityMap/utils/rgbaToString';

interface ColorRgbaInputProps {
  color: RGBA;
  onChange: (color: RGBA) => void;
}

export function ColorRgbaInput({ color, onChange }: ColorRgbaInputProps) {
  const [inputValue, setInputValue] = useState(() => rgbaToString(color));
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setInputValue(rgbaToString(color));
    }
  }, [color]);

  const apply = () => {
    isFocused.current = false;
    const parsed = parseColorToRgba(inputValue);
    if (parsed) {
      onChange(parsed);
      setInputValue(rgbaToString(parsed));
    } else {
      setInputValue(rgbaToString(color));
    }
  };

  return (
    <TextInput
      placeholder="rgba(255, 0, 0, 0.5)"
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
