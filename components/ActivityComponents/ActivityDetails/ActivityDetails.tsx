'use client';

import { ActionIcon, Group, Stack, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import type { Activity } from '@/types/activity';

interface ActivityDetailsProps {
  selectedActivity: Activity | null;
  handleActivityChange: (activity: Activity | null) => void;
}

export default function ActivityDetails({
  selectedActivity,
  handleActivityChange,
}: ActivityDetailsProps) {
  if (!selectedActivity) {
    return null;
  }

  return (
    <Stack gap="xs" p="sm">
      <Group justify="space-between">
        <Text fw={700}>{selectedActivity.title}</Text>
        <ActionIcon variant="subtle" onClick={() => handleActivityChange(null)} aria-label="Close">
          <IconX size={16} />
        </ActionIcon>
      </Group>
      <Text size="sm" c="dimmed">
        {selectedActivity.activityType}
      </Text>
      {selectedActivity.desc && <Text size="sm">{selectedActivity.desc}</Text>}
      {selectedActivity.distance && <Text size="sm">{selectedActivity.distance}</Text>}
      {selectedActivity.time && <Text size="sm">{selectedActivity.time}</Text>}
    </Stack>
  );
}
