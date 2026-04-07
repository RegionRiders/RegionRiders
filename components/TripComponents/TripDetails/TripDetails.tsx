'use client';

import { CloseButton, Flex, Group, Image, Stack, Text } from '@mantine/core';
import { Trip } from '@/types/trip';

const TripDetails = ({
  selectedTrip,
  handleTripChange,
}: {
  selectedTrip: Trip | null;
  handleTripChange: (trip: Trip | null) => void;
}) => {
  return (
    <>
      <Group py="md">
        <Flex px="md" gap="md">
          <CloseButton size="lg" onClick={() => handleTripChange(null)} />
          <Text fw="bold" size="xl" lineClamp={1}>
            {selectedTrip?.title}
          </Text>
        </Flex>

        <Image src="/assets/placeholders/map_image_placeholder.jpg" h={350} />

        <Stack ml="md" gap={0}>
          <Text ml="md" fw="bold" size="xl">
            {selectedTrip?.title}
          </Text>
        </Stack>
      </Group>
    </>
  );
};

export default TripDetails;
