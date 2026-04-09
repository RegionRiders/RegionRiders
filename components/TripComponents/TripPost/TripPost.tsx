'use client';

import {
  Anchor,
  Card,
  Collapse,
  createTheme,
  Divider,
  Group,
  Image,
  List,
  MantineProvider,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { ActivityTypeIcon } from '@/components/ActivityComponents/ActivityTypeIcon/ActivityTypeIcon';
import TripDateFormatter from '@/components/TripComponents/TripDateFormatter/TripDateFormatter';
import {
  dateNoTime,
  dateOnlyTime,
  dayDifference,
} from '@/components/Utils/DateFormattingFunctions';
import { Activity } from '@/types/activity';
import { Trip } from '@/types/trip';

const tripsBreakpoints = createTheme({
  breakpoints: {
    asideOpenHide: '76em', // point at which some things have to disappear when aside is open
  },
});

const TripPostActivityStat = ({ value }: { value: string }) => (
  <>
    <Divider orientation="vertical" />
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

const ActivitiesListItem = ({
  activity,
  isNewDay,
  dayCount,
  days,
}: {
  activity: Activity;
  isNewDay: boolean;
  dayCount: number;
  days: number;
}) => (
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
    <List size="sm" c="dimmed" pl="md" icon={<Text>{dateOnlyTime(activity.startDate)}</Text>}>
      <List.Item c="dimmed">
        <Group w="100%">
          <Group>
            <ActivityTypeIcon type={activity.activityType} size={25} />
            <Anchor href="https://http.cat/images/404.jpg">
              <Text truncate="end" w={170}>
                {activity.title}
              </Text>
            </Anchor>
          </Group>

          <Group display={{ base: 'none', asideOpenHide: 'flex' }} ml="auto">
            <TripPostActivityStat value={activity.distance} />
            <TripPostActivityStat value={activity.time} />
          </Group>
        </Group>
      </List.Item>
    </List>
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

  const activitiesToShow = activities.length < 6 ? 5 : 4;
  const [activitiesExpanded, { toggle }] = useDisclosure(false);

  const mapActivities = (start: number, end?: number) =>
    activities.slice(start, end).map((activity: Activity) => {
      const isNewDay = !prevActivityDate || !isSameDay(prevActivityDate, activity.startDate);

      if (isNewDay) {
        if (prevActivityDate !== null) {
          dayCount += dayDifference(activity.startDate, prevActivityDate);
        }

        prevActivityDate = activity.startDate;
      }

      return (
        <ActivitiesListItem
          activity={activity}
          isNewDay={isNewDay}
          dayCount={dayCount}
          days={days}
          key={activity.id}
        />
      );
    });

  return (
    <>
      {mapActivities(0, activitiesToShow)}

      {activities.length > 5 && (
        <>
          <Anchor onClick={toggle}>
            {activitiesExpanded
              ? 'Hide activities'
              : `...and ${activities.length - 4} more activities`}
          </Anchor>
          <Collapse in={activitiesExpanded}>{mapActivities(activitiesToShow)}</Collapse>
        </>
      )}
    </>
  );
};

const TripPost = ({ data, onSelect }: { data: Trip; onSelect: (trip: Trip) => void }) => (
  <MantineProvider theme={tripsBreakpoints}>
    <Card
      shadow="sm"
      radius="md"
      withBorder
      mx="md"
      w={{ base: 320, sm: 370, asideOpenHide: 'auto' }}
    >
      <Group mb="xs" align="flex-start">
        <Card.Section>
          <UnstyledButton
            onClick={() => {
              onSelect(data);
            }}
          >
            <Image
              src="/assets/placeholders/map_image_placeholder.jpg"
              h={{ base: 'auto', asideOpenHide: 250 }}
              w={{ base: '100%', asideOpenHide: 'auto' }}
              radius="md"
              fit="fill"
            />
          </UnstyledButton>
        </Card.Section>

        <Stack ml={{ base: 0, asideOpenHide: 'md' }} gap={0} w={{ base: 'auto', xs: 270 }}>
          <Anchor
            fw="bold"
            size="xl"
            mb={0}
            lineClamp={2}
            onClick={() => {
              onSelect(data);
            }}
          >
            {data.title}
          </Anchor>

          <TripDateFormatter startDate={data.startDate} endDate={data.endDate} />

          <TripStat header="Distance:" value={data.distance} />
          <TripStat header="Regions discovered:" value="2" />
          <TripStat header="Regions visited:" value="5" />
        </Stack>
      </Group>

      <Divider orientation="horizontal" size="md" mt="xs" mb="xs" />

      <Activities
        activities={data.activities}
        tripStartDate={data.startDate}
        tripEndDate={data.endDate}
      />
    </Card>
  </MantineProvider>
);

export { TripPost };
