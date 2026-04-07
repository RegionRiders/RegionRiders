'use client';

import { Stack, Text } from '@mantine/core';

interface Trip {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
}

interface TripsListElementProps {
  trip: Trip;
}

export function TripsListElement({ trip }: TripsListElementProps) {
  return (
    <Stack gap="xs">
      <Text fw={600}>{trip.title}</Text>
    </Stack>
  );
}
