'use client';

import { Group, Text } from '@mantine/core';

interface TripDateFormatterProps {
  startDate: Date;
  endDate: Date;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function TripDateFormatter({ startDate, endDate }: TripDateFormatterProps) {
  return (
    <Group gap="xs">
      <Text size="sm">Start date: {formatDate(startDate)}</Text>
      <Text size="sm">End date: {formatDate(endDate)}</Text>
    </Group>
  );
}
