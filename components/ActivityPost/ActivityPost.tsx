import { Box, Card, Flex, Group, Image, SimpleGrid, Stack, Text } from '@mantine/core';
import { ActivityData } from '@/types/ActivityData';
import {ActivityTypeIcon} from "@/components/ActivityTypeIcon/ActivityTypeIcon";

const ActivityStat = ({ name, value }: { name: string; value: string }) => (
  <Stack gap="md">
    <Text>{name}</Text>
    <Text>{value}</Text>
  </Stack>
);

const ActivityPost = ({ data, imageUrl }: { data: ActivityData; imageUrl?: string }) => (
  <Card shadow="sm" radius="md" withBorder>
    <Flex direction="row" gap="xl" justify="flex-start" align="center" wrap="nowrap">
      {/*Activity route preview image*/}
      <Box>
        <Card.Section>
          <Image src={imageUrl || '/assets/placeholders/activity.jpg'} h={100} w={100} />
        </Card.Section>
      </Box>

      <Stack align="flex-start" justify="center" display="block">
        <Group>
          {/*Icon*/}
          <ActivityTypeIcon
              type={data.activityType}
              size={200}
          />

          {/*Title*/}
          <Text fw={650} truncate="end" w={225}>
            {data.title}
          </Text>

          {/*Start date*/}
          <Text c="dimmed" size="xs">
            {data.startDate}
          </Text>
        </Group>

        {/*Description*/}
        <Text size="sm" c="dimmed" lineClamp={2} maw={350}>
          {data.desc}
        </Text>
      </Stack>

      <SimpleGrid cols={3} spacing="xs">
        <ActivityStat name="Distance" value={data.distance} />
        <ActivityStat name="Time" value={data.time} />
        <ActivityStat name="Average" value={data.average} />
      </SimpleGrid>
    </Flex>
  </Card>
);

export { ActivityPost };
