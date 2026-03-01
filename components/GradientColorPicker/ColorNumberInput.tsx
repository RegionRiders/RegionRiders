'use strict';

import { NumberInput } from '@mantine/core';

export function ColorNumberInput({
  label,
  value,
  index,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number | string, index: number) => void;
  index: number;
}) {
  return (
    <NumberInput
      size="xs"
      label={label}
      value={value}
      min={0}
      max={label === 'Opacity' ? 1 : 255}
      onChange={(v) => onChange(v, index)}
    />
  );
}
