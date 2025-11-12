'use client';

import {Card, Image, Text, Stack, ScrollArea} from '@mantine/core';

const ActivityPost = () => (
  <Card shadow="sm" padding="lg" radius="md" withBorder w={300}>
    <Card.Section>
      <Image src="https://http.cat/images/404.jpg" h={100}/>
    </Card.Section>

    <Text fw={500} mt="md" mb="xs">
      Wycieczka wgłąb torby
    </Text>

    <Text size="sm" c="dimmed" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
      Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!
    </Text>


  </Card>
);

export function ActivitiesListElement() {
  return (
    <>
        <Stack
          align="center"
          justify="flex-start"
          gap="md"
        >
          <ActivityPost/>
          <ActivityPost/>
          <ActivityPost/>
          <ActivityPost/>
          <ActivityPost/>
          <ActivityPost/>
          <ActivityPost/>
          <ActivityPost/>
          <ActivityPost/>
          <ActivityPost/>
        </Stack>

    </>
  )
}