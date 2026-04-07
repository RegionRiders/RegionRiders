'use client';

import { Stack, Text } from '@mantine/core';
import type { Activity } from '@/types/activity';

interface ActivitiesListElementProps {
  activity: Activity;
}

export function ActivitiesListElement({ activity }: ActivitiesListElementProps) {
  return (
    <Stack gap="xs">
      <Text fw={600}>{activity.title}</Text>
    </Stack>
  );
}
