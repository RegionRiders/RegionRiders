'use client';

import {Card, Flex, Image, SimpleGrid, Stack, Text} from "@mantine/core";
import {PostsList} from "@/components/PostsList/PostsList";

interface TripData {
  title: string;
  distance: string;
  activities: string[];
}

const trips: TripData[] = [
  {title: "wycieczka poranna", distance: "0.71 km", activities: ["kibel", "karton", "kuchnia", "ryj człowieka"]}
]

const TripPost = (
  {data} : {data: TripData;}) => (
  <Card shadow="sm" padding="xs" radius="md" withBorder w={600}>
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
        <Text size="sm" c="dimmed" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
          <ul>
            {data.activities.map((activity: string) => (<li>{activity}</li>))}
          </ul>
        </Text>
      </Stack>

    </Flex>
  </Card>

);

export function TripsListElement() {
  return (
    <>
      <PostsList Content={trips.map((trip: TripData) => (<TripPost data={trip}/>))}/>
    </>
  )
}