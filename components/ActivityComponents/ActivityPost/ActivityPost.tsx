'use client';

import Image from 'next/image';
import { Card, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { ActivityTypeIcon } from '@/components/ActivityComponents/ActivityTypeIcon/ActivityTypeIcon';
import type { Activity } from '@/types/activity';

interface ActivityPostProps {
  data: Activity;
  onSelect: (activity: Activity) => void;
  imageUrl?: string;
}

export function ActivityPost({ data, onSelect, imageUrl }: ActivityPostProps) {
  const imgSrc = imageUrl ?? '/map_image_placeholder.png';
  const handleSelect = () => onSelect(data);

  return (
    <Card shadow="sm" padding="sm" radius="md" withBorder>
      <Group align="flex-start">
        <UnstyledButton onClick={handleSelect}>
          <Image src={imgSrc} alt={data.title} width={80} height={60} />
        </UnstyledButton>
        <Stack gap={4} style={{ flex: 1 }}>
          <Group>
            <ActivityTypeIcon type={data.activityType} size={20} />
            <UnstyledButton onClick={handleSelect}>
              <Text fw={600}>{data.title}</Text>
            </UnstyledButton>
          </Group>
          {data.distance && <Text size="sm">{data.distance}</Text>}
          {data.time && <Text size="sm">{data.time}</Text>}
          {data.average && <Text size="sm">{data.average}</Text>}
        </Stack>
      </Group>
    </Card>
  );
}
