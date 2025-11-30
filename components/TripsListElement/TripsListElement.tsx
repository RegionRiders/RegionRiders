'use client';

import { PostsList } from '@/components/PostsList/PostsList';
import { TripPost } from '@/components/TripPost/TripPost';
import { ActivityData } from '@/types/ActivityData';
import { TripData } from '@/types/TripData';

const activities: ActivityData[] = [
  {
    id: crypto.randomUUID(),
    activityType: 'walk',
    title: 'Wycieczka wgłąb torby',
    desc: 'Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!',
    distance: '0.13 km',
    time: '00:00:32',
    average: '7.02 km/h',
    startDate: '2019-07-23 11:33',
    endDate: '2019-07-23 11:36',
  },
  {
    id: crypto.randomUUID(),
    activityType: 'walk',
    title: 'Wycieczka wgłąb torby',
    desc: 'Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!',
    distance: '0.13 km',
    time: '00:00:32',
    average: '7.02 km/h',
    startDate: '2019-07-23 11:33',
    endDate: '2019-07-23 11:36',
  },
  {
    id: crypto.randomUUID(),
    activityType: 'walk',
    title: 'Wycieczka wgłąb torby',
    desc: 'Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!',
    distance: '0.13 km',
    time: '00:00:32',
    average: '7.02 km/h',
    startDate: '2019-07-23 11:33',
    endDate: '2019-07-23 11:36',
  },
  {
    id: crypto.randomUUID(),
    activityType: 'walk',
    title: 'Wycieczka wgłąb torby',
    desc: 'Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!',
    distance: '0.13 km',
    time: '00:00:32',
    average: '7.02 km/h',
    startDate: '2019-07-23 11:33',
    endDate: '2019-07-23 11:36',
  },
  {
    id: crypto.randomUUID(),
    activityType: 'walk',
    title: 'Wycieczka wgłąb torby',
    desc: 'Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!',
    distance: '0.13 km',
    time: '00:00:32',
    average: '7.02 km/h',
    startDate: '2019-07-23 11:33',
    endDate: '2019-07-23 11:36',
  },
  {
    id: crypto.randomUUID(),
    activityType: 'walk',
    title: 'Wycieczka wgłąb torby',
    desc: 'Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!',
    distance: '0.13 km',
    time: '00:00:32',
    average: '7.02 km/h',
    startDate: '2019-07-23 11:33',
    endDate: '2019-07-23 11:36',
  },
];

const trips: TripData[] = [
  {
    id: crypto.randomUUID(),
    title: 'wycieczka poranna',
    distance: '0.71 km',
    startDate: '2019-07-23 12:33',
    endDate: '2019-07-24 7:23',
    activities,
  },
  {
    id: crypto.randomUUID(),
    title: 'wycieczka poranna',
    distance: '0.71 km',
    startDate: '2019-07-23 12:33',
    endDate: '2019-07-24 7:23',
    activities,
  },
  {
    id: crypto.randomUUID(),
    title: 'wycieczka poranna',
    distance: '0.71 km',
    startDate: '2019-07-23 12:33',
    endDate: '2019-07-24 7:23',
    activities,
  },
  {
    id: crypto.randomUUID(),
    title: 'wycieczka poranna',
    distance: '0.71 km',
    startDate: '2019-07-23 12:33',
    endDate: '2019-07-24 7:23',
    activities,
  },
  {
    id: crypto.randomUUID(),
    title: 'wycieczka poranna',
    distance: '0.71 km',
    startDate: '2019-07-23 12:33',
    endDate: '2019-07-24 7:23',
    activities,
  },
  {
    id: crypto.randomUUID(),
    title: 'wycieczka poranna',
    distance: '0.71 km',
    startDate: '2019-07-23 12:33',
    endDate: '2019-07-24 7:23',
    activities,
  },
];

export function TripsListElement() {
  return (
    <>
      <PostsList
        Content={trips.map((trip: TripData) => (
          <TripPost data={trip} />
        ))}
      />
    </>
  );
}
