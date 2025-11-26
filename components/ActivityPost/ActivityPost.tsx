import {Box, Card, Flex, Group, Image, SimpleGrid, Stack, Text, ThemeIcon} from "@mantine/core";
import {ActivityData} from "@/components/ActivityPost/ActivityData";
import {IconShoe} from "@tabler/icons-react";

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


      <Stack align="flex-start" justify="center" display="block">
        <Group>
          <ThemeIcon>
            <IconShoe/>
          </ThemeIcon>
          <Text fw={500} truncate="end" w={300}>
            {data.title}
          </Text>
        </Group>

        <Text size="sm" c="dimmed" lineClamp={2} w={300}>
          {data.desc}
        </Text>
      </Stack>

      <SimpleGrid cols={4} spacing="xs">
        <ActivityStat name="Distance" value={data.distance} />
        <ActivityStat name="Time" value={data.time} />
        <ActivityStat name="Average" value={data.average} />
        <ActivityStat name="Start Date" value={data.startDate} />
      </SimpleGrid>
    </Flex>
  </Card>

);

export { ActivityPost };