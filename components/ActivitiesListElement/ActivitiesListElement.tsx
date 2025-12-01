'use client';

import { ActivityPost } from '@/components/ActivityPost/ActivityPost';
import { PostsList } from '@/components/PostsList/PostsList';
import { mockActivities } from '@/lib/mockData';

export function ActivitiesListElement() {
  return (
    <>
      <PostsList
        Content={mockActivities.map((activity) => (
          <ActivityPost key={activity.id} data={activity} />
        ))}
      />
    </>
  );
}
