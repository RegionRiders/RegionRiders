import { Anchor, Card, Divider, Group, Image, List, Stack, Text } from '@mantine/core';
import { ActivityTypeIcon } from '@/components/ActivityComponents/ActivityTypeIcon/ActivityTypeIcon';
import TripDateFormatter from "@/components/TripComponents/TripDateFormatter/TripDateFormatter";
import { dateNoTime, dateOnlyTime, dayDifference } from "@/components/Utils/DateFormattingFunctions";
import { Activity } from '@/types/activity';
import { Trip } from '@/types/trip';


const TripPostActivityStat = ({ value }: { value: string }) => (
  <>
    <Divider orientation="vertical"/>
    <Text>{value}</Text>
  </>
);

const TripStat = ({ header, value }: { header: string; value: string }) => (
  <>
    <Group gap="xs">
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
    date1.getDate() === date2.getDate();

  const days = dayDifference(tripEndDate, tripStartDate) + 1;

  let prevActivityDate: Date | null = null;
  let dayCount = 1;

  return (
    <>
      {activities.map((activity: Activity) => {
        const isNewDay = !prevActivityDate || !isSameDay(prevActivityDate, activity.startDate);

        if (isNewDay) {
          if (prevActivityDate !== null) {
            dayCount += dayDifference(activity.startDate, prevActivityDate);
          }

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
            <List size="sm" c="dimmed" pl={{base: 0, xs: "md"}} icon={<Text>{dateOnlyTime(activity.startDate)}</Text>}>
              <List.Item c="dimmed">
                <Group>
                  <ActivityTypeIcon type={activity.activityType} size={25} />
                  <Anchor href="https://http.cat/images/404.jpg">
                    <Text truncate="end">
                      {activity.title}
                    </Text>
                  </Anchor>

                  <Group display={{base: "none", lg: "flex"}}>
                    <TripPostActivityStat value={activity.distance} />
                    <TripPostActivityStat value={activity.time} />
                  </Group>
                </Group>
              </List.Item>
            </List>
          </>
        );
      })}
    </>
  );
};

const TripPost = ({ data, onSelect }: { data: Trip; onSelect: (trip: Trip) => void }) => (
  <Card shadow="sm" radius="md" withBorder mx="md">
    <Group mb="xs" align="flex-start">
      <Card.Section>
        <Anchor
          onClick={() => {
            onSelect(data);
          }}
        >
          <Image
            src="/assets/placeholders/map_image_placeholder.jpg"
            h={{ base: "auto", xs: 250 }}
            w={{ base: "100%", xs: "auto" }}
            radius="md"
            fit="fill"
          />
        </Anchor>

      </Card.Section>

      <Stack ml={{base: 0, xs: "md"}} gap={0}>
        <Anchor
          onClick={() => {
            onSelect(data);
          }}
        >
          <Text
            fw="bold"
            size="xl"
            mb={0}
          >
            {data.title}
          </Text>
        </Anchor>

        <TripDateFormatter startDate={data.startDate} endDate={data.endDate} />

        <TripStat header="Distance:" value={data.distance} />
        <TripStat header="Regions discovered:" value="placeholder" />
        <TripStat header="Regions visited:" value="placeholder" />
      </Stack>
    </Group>

    <Divider orientation="horizontal" size="md" mt="xs" mb="xs" />

    <Activities
      activities={data.activities}
      tripStartDate={data.startDate}
      tripEndDate={data.endDate}
    />
  </Card>
);

export { TripPost };
