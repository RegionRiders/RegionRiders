'use client';

import { useState } from "react";
import { AppShell, Card, CloseButton, Group, Image, ScrollArea, Stack, Text } from "@mantine/core";
import { PostsList } from '@/components/PostsList/PostsList';
import { TripPost } from '@/components/TripComponents/TripPost/TripPost';
import { mockTrips } from '@/lib/mockData';
import { Trip } from "@/types/trip";


export function TripsListElement(toggleTrip: () => void) {
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const handleTripChange = (data: Trip | null) => {
    if (selectedTrip === null) {
      toggleTrip();
    }

    if (data === null) {
      setSelectedTrip(null);
      toggleTrip();
    } else {
      setSelectedTrip(data);
    }
  };

  return (
    <>
      <AppShell.Navbar>
        <AppShell.Section component={ScrollArea}>
          <PostsList
            Content={mockTrips.map((trip) => (
              <TripPost key={trip.id} data={trip} onSelect={(data: Trip) => {handleTripChange(data)}}/>
            ))}
          />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Aside>
        <Group py="md">
          <Group p="sm">
            <CloseButton size="lg" ml="auto" onClick={() => handleTripChange(null)}/>
            <Text fw="bold" size="xl">
              {selectedTrip?.title}
            </Text>
          </Group>

          <Image src="https://http.cat/images/404.jpg" h={350} />

          <Stack ml="md" gap={0}>
            <Text ml="md" fw="bold" size="xl">
              {selectedTrip?.title}
            </Text>
          </Stack>
        </Group>
      </AppShell.Aside>
    </>
  );
}
