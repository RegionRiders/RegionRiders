import {Box, Card, Flex, Group, Image, SimpleGrid, Stack, Text} from '@mantine/core';
import { ActivityTypeIcon } from '@/components/ActivityComponents/ActivityTypeIcon/ActivityTypeIcon';
import { dateWithTime } from '@/components/Utils/DateFormattingFunctions';
import { Activity } from '@/types/activity';


const ActivityStat = ({ name, value }: { name: string; value: string }) => (
  <Text>{value}</Text>
);

const ActivityPost = ({ data, imageUrl, onSelect }: { data: Activity; imageUrl?: string; onSelect: (activity: Activity | null) => void }) => (
  <Card shadow="sm" radius="md" withBorder padding="xs">
    <Flex
      direction="row"
      gap="md"
      align={{ base: 'stretch', sm: 'center' }}
      justify="flex-start"
    >
      <Image
        src={imageUrl || '/assets/placeholders/activity.jpg'}
        w={{ base: "4rem", sm: "6rem" }}
        h={{ base: "auto", sm: "6rem" }}
        fit="fill"
        radius="md"
      />

      {/* Content */}
      <Stack flex={1} gap={0}>
        <Group pb={{base: 0, sm: "xs"}}>
          <ActivityTypeIcon type={data.activityType} size={28}/>

          <Stack gap={0}>
            <Text c="dimmed" size="xs">
              {dateWithTime(data.startDate)}
            </Text>

            <Text fw={650} truncate="end" onClick={() => onSelect(data)}>
              {data.title}
            </Text>
          </Stack>
        </Group>

        <Text size="sm" c="dimmed" lineClamp={1} truncate="end" maw="25vw" display={{base: 'none', sm: 'block'}}>
          {data.desc}
        </Text>

        <SimpleGrid
          cols={{ base: 3, sm: 3 }}
          spacing={0}
          display={{base: 'grid', sm: 'none'}}
        >
          <ActivityStat name="Distance" value={data.distance} />
          <ActivityStat name="Time" value={data.time} />
          <ActivityStat name="Average" value={data.average} />
        </SimpleGrid>
      </Stack>

      <SimpleGrid
        cols={{ base: 3, sm: 3 }}
        spacing="xs"
        w={{ base: "15vw", sm: 240 }}
        display={{base: 'none', sm: 'grid'}}
      >
        <ActivityStat name="Distance" value={data.distance} />
        <ActivityStat name="Time" value={data.time} />
        <ActivityStat name="Average" value={data.average} />
      </SimpleGrid>
    </Flex>
  </Card>
);

export { ActivityPost };
