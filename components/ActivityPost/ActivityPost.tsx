import { Box, Card, Flex, Image, SimpleGrid, Stack, Text } from "@mantine/core";
import {ActivityData} from "@/components/ActivityPost/ActivityData";

const ActivityStat = ({name, value} : {name: string; value: string;}) => (
  <Stack gap="md">
    <Text>
      {name}
    </Text>
    <Text>
      {value}
    </Text>
  </Stack>
)

const ActivityPost = (
  {data} : {data: ActivityData;}) => (
  <Card shadow="sm" radius="md" withBorder>
    <Flex
      direction="row"
      gap="xl"
      justify="flex-start"
      align="center"
      wrap="nowrap">

      <Box>
        <Card.Section>
          <Image src="https://http.cat/images/404.jpg" h={100} w={100}/>
        </Card.Section>
      </Box>


      <Stack align="flex-start" justify="center" gap="md">
        <Text fw={500} truncate="end" w={300}>
          {data.title}
        </Text>
        <Text size="sm" c="dimmed" truncate="end" w={300}>
          {data.desc}
        </Text>
      </Stack>

      <SimpleGrid cols={3}>
        <ActivityStat name="Distance" value={data.distance} />
        <ActivityStat name="Time" value={data.time} />
        <ActivityStat name="Average" value={data.average} />
      </SimpleGrid>
    </Flex>
  </Card>

);

export { ActivityPost };