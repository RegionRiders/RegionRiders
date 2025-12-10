'use client';

import { PostsList } from '@/components/PostsList/PostsList';
import { TripPost } from '@/components/TripPost/TripPost';
import { mockTrips } from '@/lib/mockData';
import {Card, Flex, Image, Stack, Text} from "@mantine/core";
import {useState} from "react";
import {Trip} from "@/types/trip";

export function TripsListElement() {

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  return (
    <>
      <Flex>
        <PostsList
          Content={mockTrips.map((trip) => (
            <TripPost key={trip.id} data={trip} onSelect={setSelectedTrip} />
          ))}
        />

        <Card shadow="sm" radius="md" withBorder>
          <Card.Section>
            <Image src="https://http.cat/images/404.jpg" h={350} />
          </Card.Section>

          <Stack ml="md" gap={0}>
            <Text>
              {selectedTrip?.title}
            </Text>
          </Stack>
        </Card>
      </Flex>

    </>
  );
}
