'use client';

import { ActivityPost } from '@/components/ActivityPost/ActivityPost';
import { PostsList } from '@/components/PostsList/PostsList';
import { ActivityData } from '@/types/ActivityData';

const activities: ActivityData[] = [
  {
    id: crypto.randomUUID(),
    title: 'Wycieczka wgłąb torbyfdsvfdgfhdgfgdfbhdgfhdgfbhjghfj',
    desc: 'Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!',
    distance: '0.13 km',
    time: '00:00:32',
    average: '7.02 km/h',
    startDate: '2019-07-23 11:33',
  },
  {
    id: crypto.randomUUID(),
    title: 'Wycieczka wgłąb torby',
    desc: 'Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!',
    distance: '0.13 km',
    time: '00:00:32',
    average: '7.02 km/h',
    startDate: '2019-07-23 11:33',
  },
  {
    id: crypto.randomUUID(),
    title: 'Wycieczka wgłąb torby',
    desc: 'Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!',
    distance: '0.13 km',
    time: '00:00:32',
    average: '7.02 km/h',
    startDate: '2019-07-23 11:33',
  },
  {
    id: crypto.randomUUID(),
    title: 'Wycieczka wgłąb torby',
    desc: 'Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!',
    distance: '0.13 km',
    time: '00:00:32',
    average: '7.02 km/h',
    startDate: '2019-07-23 11:33',
  },
  {
    id: crypto.randomUUID(),
    title: 'Wycieczka wgłąb torby',
    desc: 'Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!',
    distance: '0.13 km',
    time: '00:00:32',
    average: '7.02 km/h',
    startDate: '2019-07-23 11:33',
  },
  {
    id: crypto.randomUUID(),
    title: 'Wycieczka wgłąb torby',
    desc: 'Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!',
    distance: '0.13 km',
    time: '00:00:32',
    average: '7.02 km/h',
    startDate: '2019-07-23 11:33',
  },
  {
    id: crypto.randomUUID(),
    title: 'Wycieczka wgłąb torby',
    desc: 'Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!',
    distance: '0.13 km',
    time: '00:00:32',
    average: '7.02 km/h',
    startDate: '2019-07-23 11:33',
  },
  {
    id: crypto.randomUUID(),
    title: 'Wycieczka wgłąb torby',
    desc: 'Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!',
    distance: '0.13 km',
    time: '00:00:32',
    average: '7.02 km/h',
    startDate: '2019-07-23 11:33',
  },
  {
    id: crypto.randomUUID(),
    title: 'Wycieczka wgłąb torby',
    desc: 'Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!',
    distance: '0.13 km',
    time: '00:00:32',
    average: '7.02 km/h',
    startDate: '2019-07-23 11:33',
  },
  {
    id: crypto.randomUUID(),
    title: 'Wycieczka wgłąb torby',
    desc: 'Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!',
    distance: '0.13 km',
    time: '00:00:32',
    average: '7.02 km/h',
    startDate: '2019-07-23 11:33',
  },
];

export function ActivitiesListElement() {
  return (
    <>
      <PostsList
        Content={activities.map((activity: ActivityData) => (
          <ActivityPost key={`${activity.id}`} data={activity} />
        ))}
      />
    </>
  );
}
