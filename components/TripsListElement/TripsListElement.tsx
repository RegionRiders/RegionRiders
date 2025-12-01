'use client';

import { PostsList } from '@/components/PostsList/PostsList';
import { TripPost } from '@/components/TripPost/TripPost';
import { mockTrips } from '@/lib/mockData';

export function TripsListElement() {
  return (
    <>
      <PostsList
        Content={mockTrips.map((trip) => (
          <TripPost key={trip.id} data={trip} />
        ))}
      />
    </>
  );
}
