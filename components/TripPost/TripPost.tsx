import { Anchor, Card, Divider, Group, Image, List, Text } from '@mantine/core';
import { Activity } from '@/types/activity';
import { Trip } from '@/types/trip';

const TripPostActivityStat = ({ value }: { value: string }) => (
  <>
    <Divider orientation="vertical" />
    <Text>{value}</Text>
  </>
);

const TripStat = ({ value }: { value: string }) => (
  <>
    <Divider orientation="vertical" size="xl" />
    <Text size="md">{value}</Text>
  </>
);

const TripPost = ({ data }: { data: Trip }) => (
  <Card shadow="sm" radius="md" withBorder>
    <Card.Section>
      <Image src="https://http.cat/images/404.jpg" h={150} />
    </Card.Section>

    <Group mt="md">
      <Text fw="bold" size="lg">
        {data.title}
      </Text>
      <TripStat value={data.distance} />
      <TripStat value={data.startDate} />
      <TripStat value={data.endDate} />
    </Group>

    <Divider orientation="horizontal" size="md" mt="xs" mb="xs" />

    <List size="sm" c="dimmed">
      {data.activities.map((activity: Activity) => (
        <List.Item c="dimmed">
          <Group>
            <Anchor href="https://http.cat/images/404.jpg">
              <Text truncate="end" w={250}>
                {activity.title}
              </Text>
            </Anchor>
            <TripPostActivityStat value={activity.distance} />
            <TripPostActivityStat value={activity.time} />
            <TripPostActivityStat value={activity.startDate} />
          </Group>
        </List.Item>
      ))}
    </List>
  </Card>
);

export { TripPost };
