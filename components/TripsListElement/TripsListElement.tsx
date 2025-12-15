'use client';

import { PostsList } from '@/components/PostsList/PostsList';
import { TripPost } from '@/components/TripPost/TripPost';
import { mockTrips } from '@/lib/mockData';
import {AppShell, Card, CloseButton, Flex, Group, Image, ScrollArea, Stack, Text} from "@mantine/core";
import {useState} from "react";
import {Trip} from "@/types/trip";

export function TripsListElement() {

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  return (
    <>
      <AppShell.Navbar>
        <AppShell.Section component={ScrollArea}>
          <PostsList
            Content={mockTrips.map((trip) => (
              <TripPost key={trip.id} data={trip} onSelect={setSelectedTrip} />
            ))}
          />
        </AppShell.Section>

      </AppShell.Navbar>

      <AppShell.Aside>
        <Group p="md">
          <Card shadow="sm" radius="md" withBorder>
            <Card.Section>
              <Group p="sm">
                <Text fw="bold" size="xl">
                  {selectedTrip?.title}
                </Text>
                <CloseButton size="lg" ml="auto"/>
              </Group>
            </Card.Section>

            <Card.Section>
              <Image src="https://http.cat/images/404.jpg" h={350} />
            </Card.Section>

            <Stack ml="md" gap={0}>
              <Text ml="md" fw="bold" size="xl">
                {selectedTrip?.title}
              </Text>
            </Stack>
          </Card>
        </Group>

      </AppShell.Aside>
    </>
  );
}
