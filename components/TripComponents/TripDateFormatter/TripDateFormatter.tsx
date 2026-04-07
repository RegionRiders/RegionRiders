'use client';

import { Group, Text } from '@mantine/core';

interface TripDateFormatterProps {
  startDate: Date;
  endDate: Date;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function TripDateFormatter({ startDate, endDate }: TripDateFormatterProps) {
  return (
    <Group gap="xs">
      <Text size="sm">🚥 {formatDate(startDate)}</Text>
      <Text size="sm">🏁 {formatDate(endDate)}</Text>
    </Group>
  );
}
