'use client';

import { PostsList } from '@/components/PostsList/PostsList';
import { TripPost } from '@/components/TripPost/TripPost';
import { mockTrips } from '@/lib/mockData';
import {Flex} from "@mantine/core";
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
        {selectedTrip?.title}
      </Flex>

    </>
  );
}
