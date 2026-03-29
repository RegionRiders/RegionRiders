import {Card, Flex, Group, Image, SimpleGrid, Stack, Text} from '@mantine/core';
import { ActivityTypeIcon } from '@/components/ActivityComponents/ActivityTypeIcon/ActivityTypeIcon';
import { dateWithTime } from '@/components/Utils/DateFormattingFunctions';
import { Activity } from '@/types/activity';


const ActivityStat = ({ value }: { name: string; value: string }) => (
  <Text>{value}</Text>
);

const ActivityPost = ({ data, imageUrl, onSelect }: { data: Activity; imageUrl?: string; onSelect: (activity: Activity | null) => void }) => (
  <Card shadow="sm" radius="md" withBorder p={{base: "xs", lg: 0}}>
    <Flex
      direction="row"
      gap="md"
      align={{ base: 'stretch', lg: 'center' }}
      justify="flex-start"
    >
      <Image
        src={imageUrl || '/assets/placeholders/map_image_placeholder.jpg'}
        w={{ base: "4rem", lg: "6rem" }}
        h={{ base: "auto", lg: "6rem" }}
        fit="fill"
        radius="md"
      />

      {/* Content */}
      <Stack flex={1} gap={0}>
        <Group pb={{base: 0, lg: "xs"}}>
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

        <Text size="sm" c="dimmed" lineClamp={1} truncate="end" maw="20vw" display={{base: 'none', lg: 'block'}}>
          {data.desc}
        </Text>

        <SimpleGrid
          cols={3}
          spacing={0}
          display={{base: 'grid', lg: 'none'}}
        >
          <ActivityStat name="Distance" value={data.distance} />
          <ActivityStat name="Time" value={data.time} />
          <ActivityStat name="Average" value={data.average} />
        </SimpleGrid>
      </Stack>

      <SimpleGrid
        cols={3}
        spacing={0}
        w={{ base: "15vw", lg: 220 }}
        display={{base: 'none', lg: 'grid'}}
      >
        <ActivityStat name="Distance" value={data.distance} />
        <ActivityStat name="Time" value={data.time} />
        <ActivityStat name="Average" value={data.average} />
      </SimpleGrid>
    </Flex>
  </Card>
);

export { ActivityPost };
