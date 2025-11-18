'use client';

import {Card, Image, Text, Stack, Flex, Group, SimpleGrid} from '@mantine/core';
import {PostsList} from "@/components/PostsList/PostsList";

interface ActivityData {
  title: string;
  desc: string;
  distance: string;
  time: string;
  average: string;
}

const activities: ActivityData[] = [
  {title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!",
  distance: "0.13 km", time: "00:00:32", average: "7.02 km/h"},{title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!",
  distance: "0.13 km", time: "00:00:32", average: "7.02 km/h"},{title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!",
  distance: "0.13 km", time: "00:00:32", average: "7.02 km/h"},{title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!",
  distance: "0.13 km", time: "00:00:32", average: "7.02 km/h"},{title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!",
  distance: "0.13 km", time: "00:00:32", average: "7.02 km/h"},{title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!",
  distance: "0.13 km", time: "00:00:32", average: "7.02 km/h"},{title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!",
  distance: "0.13 km", time: "00:00:32", average: "7.02 km/h"},{title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!",
  distance: "0.13 km", time: "00:00:32", average: "7.02 km/h"},{title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!",
  distance: "0.13 km", time: "00:00:32", average: "7.02 km/h"},{title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!",
  distance: "0.13 km", time: "00:00:32", average: "7.02 km/h"},
]

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
  <Card shadow="sm" padding="xs" radius="md" withBorder h={100} w={1200}>
    <Flex
      direction="row"
      gap="md"
      justify="flex-start"
      align="flex-start"
      wrap="nowrap">
      <Card.Section>
        <Image src="https://http.cat/images/404.jpg" h={100} w={100}/>
      </Card.Section>

      <Stack align="flex-start" justify="center" gap="md">
        <Text fw={500}>
          {data.title}
        </Text>
        <Text size="sm" c="dimmed" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
          {data.desc}
        </Text>
      </Stack>

      <SimpleGrid cols={5}>
        <ActivityStat name="Distance" value={data.distance} />
        <ActivityStat name="Time" value={data.time} />
        <ActivityStat name="Average" value={data.average} />
      </SimpleGrid>
    </Flex>
  </Card>

);

export function ActivitiesListElement() {
  return (
    <>
      <PostsList Content={activities.map((activity: ActivityData) => (<ActivityPost data={activity} />))}/>
    </>
  )
}