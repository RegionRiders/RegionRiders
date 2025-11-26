import {Card, Flex, Image, List, Stack, Text} from "@mantine/core";
import {TripData} from "@/components/TripPost/TripData";

const TripPost = (
  {data} : {data: TripData;}) => (
  <Card shadow="sm" radius="md" withBorder w={600}>
    <Card.Section>
      <Image src="https://http.cat/images/404.jpg" h={150}/>
    </Card.Section>

    <Flex
      direction="row"
      gap="md"
      justify="flex-start"
      align="flex-start"
      wrap="nowrap">

      <Stack align="flex-start" justify="center" gap="md">
        <Text fw={500}>
          {data.title}
        </Text>
        <List size="sm" c="dimmed">
          {data.activities.map((activity: string) => (
            <List.Item>
              <Text truncate="end" w={400}>
                {activity}
              </Text>
            </List.Item>
          ))}
        </List>
      </Stack>

    </Flex>
  </Card>
);

export { TripPost };