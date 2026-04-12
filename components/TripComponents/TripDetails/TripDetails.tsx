'use client';

import { CloseButton, Flex, Stack, Text } from '@mantine/core';
import classes from '@/components/ActivityComponents/ActivityDetails/ActivityDetails.module.css';
import ActivityMap from '@/components/ActivityMap/ActivityMap';
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
      <Stack py="md">
        <Flex px="md" gap="md">
          <CloseButton size="lg" onClick={() => handleTripChange(null)} />
          <Text fw="bold" size="xl" lineClamp={1}>
            {selectedTrip?.title}
          </Text>
        </Flex>

        <div className={classes.mapSection}>
          <ActivityMap />
        </div>

        <Stack ml="md" gap={0}>
          <Text ml="md" fw="bold" size="xl">
            {selectedTrip?.title}
          </Text>
        </Stack>
      </Stack>
    </>
  );
};

export default TripDetails;
