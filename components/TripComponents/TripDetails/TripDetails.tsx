import {CloseButton, Group, Image, Stack, Text} from "@mantine/core";
import {Trip} from "@/types/trip";

const TripDetails = ({selectedTrip, handleTripChange} : {selectedTrip: (Trip | null), handleTripChange: (trip: Trip | null) => void}) => {
  return (
    <>
      <Group py="md">
        <Group p="sm">
          <CloseButton size="lg" ml="auto" onClick={() => handleTripChange(null)}/>
          <Text fw="bold" size="xl">
            {selectedTrip?.title}
          </Text>
        </Group>

        <Image src="/assets/placeholders/map_image_placeholder.jpg" h={350} />

        <Stack ml="md" gap={0}>
          <Text ml="md" fw="bold" size="xl">
            {selectedTrip?.title}
          </Text>
        </Stack>
      </Group>
    </>
  )
}

export default TripDetails;