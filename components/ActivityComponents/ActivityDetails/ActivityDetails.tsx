'use client';

import { CloseButton, Flex, Stack, Text } from '@mantine/core';
import ActivityMap from '@/components/ActivityMap/ActivityMap';
import { Activity } from '@/types/activity';
import classes from './ActivityDetails.module.css';

const ActivityDetails = ({
  selectedActivity,
  handleActivityChange,
}: {
  selectedActivity: Activity | null;
  handleActivityChange: (trip: Activity | null) => void;
}) => {
  return (
    <>
      <Stack py="md">
        <Flex px="md" gap="md">
          <CloseButton size="lg" onClick={() => handleActivityChange(null)} />
          <Text fw="bold" size="xl" lineClamp={1}>
            {selectedActivity?.title}
          </Text>
        </Flex>

        <div className={classes.mapSection}>
          <ActivityMap />
        </div>

        <Stack ml="md" gap={0}>
          <Text ml="md" fw="bold" size="xl">
            {selectedActivity?.title}
            {selectedActivity?.activityType}
          </Text>
        </Stack>
      </Stack>
    </>
  );
};

export default ActivityDetails;
