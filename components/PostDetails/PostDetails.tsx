'use client';

import { CloseButton, Flex, Stack, Text } from '@mantine/core';
import ActivityMap from '@/components/ActivityMap/ActivityMap';
import { Activity } from '@/types/activity';
import { Trip } from '@/types/trip';
import classes from './PostDetails.module.css';

const ActivityDetails = ({ activity }: { activity: Activity }) => {
  return <Text>{activity.activityType}</Text>;
};

const TripDetails = ({ trip }: { trip: Trip }) => {
  return <Text>{trip.distance}</Text>;
};

const MissingDetails = () => {
  return <Text>Error: no data to display!</Text>;
};

const PostDetails = ({
  selectedPost,
  postType,
  handlePostChange,
}: {
  selectedPost: Activity | Trip | null;
  postType: 'Activity' | 'Trip' | null;
  handlePostChange: (postData: null) => void;
}) => {
  const RenderDetails = () => {
    switch (postType) {
      case 'Activity':
        return <ActivityDetails activity={selectedPost as Activity} />;

      case 'Trip':
        return <TripDetails trip={selectedPost as Trip} />;

      default:
        return <MissingDetails />;
    }
  };

  return (
    <>
      <Stack py="md">
        <Flex px="md" gap="md">
          <CloseButton size="lg" onClick={() => handlePostChange(null)} />
          <Text fw="bold" size="xl" lineClamp={1}>
            {selectedPost?.title}
          </Text>
        </Flex>

        {selectedPost ? (
          <>
            <div className={classes.mapSection}>
              <ActivityMap />
            </div>
            <Stack ml="md" gap={0}>
              <RenderDetails/>
            </Stack>
          </>
        ) : (
          <Stack ml="md" gap={0}>
            <MissingDetails />
          </Stack>
        )}
      </Stack>
    </>
  );
};

export default PostDetails;
