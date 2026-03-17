import { useEffect, useRef, useState } from 'react';
import { TextInput } from '@mantine/core';
import { RGBA } from '@/components/ActivityMap/mapTypes';
import { colorToString } from '@/components/ActivityMap/utils/colorToString';
import { parseColorToRgba } from '@/components/ActivityMap/utils/parseColorToRgba';

interface ColorRgbaInputProps {
  color: RGBA;
  label?: string;
  onChange: (color: RGBA) => void;
}

export function ColorRgbaTextInput({ color, label, onChange }: ColorRgbaInputProps) {
  const [inputValue, setInputValue] = useState(() => colorToString(color));
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setInputValue(colorToString(color));
    }
  }, [color]);

  const apply = () => {
    isFocused.current = false;
    const parsed = parseColorToRgba(inputValue);
    if (parsed) {
      onChange(parsed);
      setInputValue(colorToString(parsed));
    } else {
      setInputValue(colorToString(color));
    }
  };

  return (
    <TextInput
      label={label}
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
