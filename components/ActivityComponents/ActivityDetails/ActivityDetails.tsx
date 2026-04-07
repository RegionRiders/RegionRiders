'use client';

import { CloseButton, Flex, Group, Image, Stack, Text } from '@mantine/core';
import { Activity } from '@/types/activity';

const ActivityDetails = ({
  selectedActivity,
  handleActivityChange,
}: {
  selectedActivity: Activity | null;
  handleActivityChange: (trip: Activity | null) => void;
}) => {
  return (
    <>
      <Group py="md">
        <Flex px="md" gap="md">
          <CloseButton size="lg" onClick={() => handleActivityChange(null)} />
          <Text fw="bold" size="xl" lineClamp={1}>
            {selectedActivity?.title}
          </Text>
        </Flex>

        <Image src="/assets/placeholders/map_image_placeholder.jpg" h={350} />

        <Stack ml="md" gap={0}>
          <Text ml="md" fw="bold" size="xl">
            {selectedActivity?.title}
            {selectedActivity?.activityType}
          </Text>
        </Stack>
      </Group>
    </>
  );
};

export default ActivityDetails;
