'use client';

import {useState} from "react";
import {AppShell, Loader} from "@mantine/core";
import { PostsList } from '@/components/PostsList/PostsList';
import { TripPost } from '@/components/TripComponents/TripPost/TripPost';
import { mockTrips } from '@/lib/mockData';
import { Trip } from "@/types/trip";
import TripDetails from "@/components/TripComponents/TripDetails/TripDetails";
import InfiniteScroll from "react-infinite-scroll-component";
import classes from "./TripsListElement.module.css";


export function TripsListElement(toggleTrip: () => void, isTripToggled: boolean) {
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const handleTripChange = (newTrip: Trip | null) => {
    if (selectedTrip === null) {
      toggleTrip();
    }

    if (isTripToggled) {
      setSelectedTrip(newTrip);
      toggleTrip();
    }

    if (newTrip === null) {
      setSelectedTrip(null);
      toggleTrip();
    } else {
      setSelectedTrip(newTrip);
    }
  };

  const [visibleTrips, setVisibleTrips] = useState<Trip[]>(mockTrips.slice(0, 2));
  const [hasMoreTrips, setHasMoreTrips] = useState<boolean>(true);

  const fetchTrips = () => {
    setTimeout(() => {
      const nextTrips = mockTrips.slice(visibleTrips.length, visibleTrips.length + 2);

      setVisibleTrips(prev => [...prev, ...nextTrips]);

      if (visibleTrips.length + nextTrips.length >= mockTrips.length) {
        setHasMoreTrips(false);
      }
    }, 500)
  }

  return (
    <>
      <AppShell.Main>
        <InfiniteScroll next={fetchTrips} hasMore={hasMoreTrips} loader={<Loader/>} dataLength={visibleTrips.length} style={{ overflow: "hidden" }}>
          <PostsList
            Content={visibleTrips.map((trip) => (
              <TripPost key={trip.id} data={trip} onSelect={(data: Trip) => {handleTripChange(data)}}/>
            ))}
          />
        </InfiniteScroll>
      </AppShell.Main>

      <AppShell.Aside>
        <TripDetails selectedTrip={selectedTrip} handleTripChange={(trip: Trip | null) => {handleTripChange(trip)}} />
      </AppShell.Aside>
    </>
  );
}
