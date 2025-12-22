'use client';

import {useState} from "react";
import { AppShell } from "@mantine/core";
import { PostsList } from '@/components/PostsList/PostsList';
import { TripPost } from '@/components/TripComponents/TripPost/TripPost';
import { mockTrips } from '@/lib/mockData';
import { Trip } from "@/types/trip";
import TripDetails from "@/components/TripComponents/TripDetails/TripDetails";


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
      <AppShell.Main>
          <PostsList
            Content={mockTrips.map((trip) => (
              <TripPost key={trip.id} data={trip} onSelect={(data: Trip) => {handleTripChange(data)}}/>
            ))}
          />
      </AppShell.Main>

      <AppShell.Aside>
        <TripDetails selectedTrip={selectedTrip} handleTripChange={(trip: Trip | null) => {handleTripChange(trip)}} />
      </AppShell.Aside>
    </>
  );
}
