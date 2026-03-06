import {dateWithTime} from "@/components/Utils/DateFormattingFunctions";
import {SimpleGrid, Text} from "@mantine/core";


const TripDateFormatter = ({startDate, endDate} : { startDate: Date, endDate: Date}) => {
  return (
    <SimpleGrid
      cols={{ base: 2, sm: 2 }}
      spacing="xs"
    >
      <Text c="dimmed" size="sm">
        🚥{dateWithTime(startDate)}
      </Text>
      <Text c="dimmed" size="sm">
        🏁{dateWithTime(endDate)}
      </Text>
    </SimpleGrid>

  )
}

export default TripDateFormatter;