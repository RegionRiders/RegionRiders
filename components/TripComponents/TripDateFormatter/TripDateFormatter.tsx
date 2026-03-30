import {dateWithTime} from "@/components/Utils/DateFormattingFunctions";
import {Flex, Text} from "@mantine/core";


const TripDateFormatter = ({startDate, endDate} : { startDate: Date, endDate: Date}) => {
  return (
    <Flex gap="xs">
      <Text c="dimmed" size="sm">
        🚥{dateWithTime(startDate)}
      </Text>
      <Text c="dimmed" size="sm">
        🏁{dateWithTime(endDate)}
      </Text>
    </Flex>

  )
}

export default TripDateFormatter;