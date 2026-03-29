import {CloseButton, Group, Image, Stack, Text} from "@mantine/core";
import {Activity} from "@/types/activity";

const ActivityDetails = ({selectedActivity, handleActivityChange} : {selectedActivity: (Activity | null), handleActivityChange: (trip: Activity | null) => void}) => {
  return (
    <>
      <Group py="md">
        <Group p="sm">
          <CloseButton size="lg" ml="auto" onClick={() => handleActivityChange(null)}/>
          <Text fw="bold" size="xl">
            {selectedActivity?.title}
          </Text>
        </Group>

        <Image src="/assets/placeholders/map_image_placeholder.jpg" h={350} />

        <Stack ml="md" gap={0}>
          <Text ml="md" fw="bold" size="xl">
            {selectedActivity?.title}
            {selectedActivity?.activityType}
          </Text>
        </Stack>
      </Group>
    </>
  )
}

export default ActivityDetails;