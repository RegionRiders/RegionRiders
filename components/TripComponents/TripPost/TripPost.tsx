import { Anchor, Card, Divider, Group, Image, List, SimpleGrid, Stack, Text } from '@mantine/core';
import { ActivityTypeIcon } from '@/components/ActivityTypeIcon/ActivityTypeIcon';
import { Activity } from '@/types/activity';
import { Trip } from '@/types/trip';
import {dateNoTime, dateOnlyTime, dateWithTime} from "@/components/Utils/DateFormattingFunctions";
import TripDateFormatter from "@/components/TripComponents/TripDateFormatter/TripDateFormatter";

const TripPostActivityStat = ({ value }: { value: string }) => (
  <>
    <Divider orientation="vertical" />
    <Text>{value}</Text>
  </>
);

const TripStat = ({ header, value }: { header: string; value: string }) => (
  <>
    <Group>
      <Text size="md" fw="bold">
        {header}
      </Text>
      <Text>{value}</Text>
    </Group>
  </>
);

const Activities = ({
  activities,
  tripStartDate,
  tripEndDate,
}: {
  activities: Activity[];
  tripStartDate: Date;
  tripEndDate: Date;
}) => {
  const isSameDay = (date1: Date, date2: Date) =>
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDay() === date2.getDay();

  const days = Math.abs(
    Math.floor(
      (new Date(
        tripEndDate.getFullYear(),
        tripEndDate.getMonth(),
        tripEndDate.getDate()
      ).getTime() -
        new Date(
          tripStartDate.getFullYear(),
          tripStartDate.getMonth(),
          tripStartDate.getDate()
        ).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  let prevActivityDate: Date | null = null;
  let dayCount = 0;

  return (
    <>
      {activities.map((activity: Activity) => {
        const isNewDay = !prevActivityDate || !isSameDay(prevActivityDate, activity.startDate);

        if (isNewDay) {
          dayCount++;
          prevActivityDate = activity.startDate;
        }

        return (
          <>
            {isNewDay && (
              <Group>
                <Text fw="bold">{dateNoTime(activity.startDate)}</Text>
                <Divider orientation="vertical" size="md" />
                <Text fw="bold">
                  Day {dayCount}/{days}
                </Text>
              </Group>
            )}
            <List size="sm" c="dimmed" icon={<Text>{dateOnlyTime(activity.startDate)}</Text>}>
              <List.Item c="dimmed">
                <Group>
                  <ActivityTypeIcon type={activity.activityType} size={25} />
                  <Anchor href="https://http.cat/images/404.jpg">
                    <Text truncate="end">
                      {activity.title}
                    </Text>
                  </Anchor>
                  <TripPostActivityStat value={activity.distance} />
                  <TripPostActivityStat value={activity.time} />
                </Group>
              </List.Item>
            </List>
          </>
        );
      })}
    </>
  );
};

const TripPost = ({ data, onSelect }: { data: Trip, onSelect: (trip: Trip) => void }) => (
  <Card shadow="sm" radius="md" withBorder>
    <SimpleGrid cols={2} mb="xs">
      <Card.Section>
        <Image src="https://http.cat/images/404.jpg" h={250} />
      </Card.Section>

      <Stack ml="md" gap={0}>
        <Text fw="bold" size="xl" mb={0} onClick={() => {onSelect(data)}}>
          {data.title}
        </Text>
        <TripDateFormatter startDate={data.startDate} endDate={data.endDate} />

        <TripStat header="Distance:" value={data.distance} />
      </Stack>
    </SimpleGrid>

    <Divider orientation="horizontal" size="md" mt="xs" mb="xs" />

    <Activities
      activities={data.activities}
      tripStartDate={data.startDate}
      tripEndDate={data.endDate}
    />
  </Card>
);

export { TripPost };
