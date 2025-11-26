import {Card, Group, Image, List, Text} from "@mantine/core";
import {TripData} from "@/components/TripPost/TripData";

const TripPost = (
  {data, width} : {data: TripData, width: number}) => (
  <Card shadow="sm" radius="md" withBorder w={width}>
    <Card.Section>
      <Image src="https://http.cat/images/404.jpg" h={150}/>
    </Card.Section>

    <Group>
      <Text fw={500} mt="md" mb="md">
        {data.title}
      </Text>
    </Group>


    <List size="sm" c="dimmed">
      {data.activities.map((activity: string) => (
        <List.Item>
          <Text truncate="end" w={width * 0.75}>
            {activity}
          </Text>
        </List.Item>
      ))}
    </List>


  </Card>
);

export { TripPost };