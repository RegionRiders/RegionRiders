'use client';

import { ActivityPost } from '@/components/ActivityPost/ActivityPost';
import { PostsList } from '@/components/PostsList/PostsList';
import { ActivityData } from '@/types/ActivityData';

const activities: ActivityData[] = [
  {
    id: crypto.randomUUID(),
    activityType: 'ride',
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
    activityType: 'hike',
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
    activityType: 'swim',
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
    activityType: 'invalid',
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
    activityType: 'stand_up_paddling',
    title: 'Wycieczka wgłąb torby',
    desc: 'Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!',
    distance: '0.13 km',
    time: '00:00:32',
    average: '7.02 km/h',
    startDate: '2019-07-23 11:33',
    endDate: '2019-07-23 11:36',
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
