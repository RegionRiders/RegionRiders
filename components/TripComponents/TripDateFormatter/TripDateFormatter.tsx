import {dateWithTime} from "@/components/Utils/DateFormattingFunctions";
import {Text} from "@mantine/core";


const TripDateFormatter = ({startDate, endDate} : { startDate: Date, endDate: Date}) => {
  return (
    <Text c="dimmed" size="sm">
      🚥{dateWithTime(startDate)} 🏁{dateWithTime(endDate)}
    </Text>
  )
}

export default TripDateFormatter;