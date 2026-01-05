'use client';

import { ActivityPost } from '@/components/ActivityComponents/ActivityPost/ActivityPost';
import { PostsList } from '@/components/PostsList/PostsList';
import { mockActivities } from '@/lib/mockData';
import {AppShell} from "@mantine/core";
import {useState} from "react";
import {Activity} from "@/types/activity";
import ActivityDetails from "@/components/ActivityComponents/ActivityDetails/ActivityDetails";
import {Trip} from "@/types/trip";

export function ActivitiesListElement(toggleActivity: () => void, isActivityToggled: boolean) {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const handleActivityChange = (newActivity: Activity | null) => {
    if (selectedActivity === null) {
      toggleActivity();
    }

    if (isActivityToggled) {
      setSelectedActivity(newActivity);
      toggleActivity();
    }

    if (newActivity === null) {
      setSelectedActivity(null);
      toggleActivity();
    } else {
      setSelectedActivity(newActivity);
    }
  };

  return (
    <>
      <AppShell.Main>
        <PostsList
          Content={mockActivities.map((activity) => (
            <ActivityPost key={activity.id} data={activity} onSelect={(data: Activity) => {handleActivityChange(data)}}/>
          ))}
        />
      </AppShell.Main>

      <AppShell.Aside>
        <ActivityDetails selectedActivity={selectedActivity} handleActivityChange={handleActivityChange} />
      </AppShell.Aside>
    </>
  );
}
