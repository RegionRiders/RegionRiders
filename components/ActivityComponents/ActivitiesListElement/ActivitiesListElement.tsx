'use client';

import { ActivityPost } from '@/components/ActivityComponents/ActivityPost/ActivityPost';
import { PostsList } from '@/components/PostsList/PostsList';
import { mockActivities } from '@/lib/mockData';
import {AppShell, Burger, Checkbox, Group, Menu} from "@mantine/core";
import {useState} from "react";
import {Activity} from "@/types/activity";
import ActivityDetails from "@/components/ActivityComponents/ActivityDetails/ActivityDetails";

export function ActivitiesListElement(toggleActivity: () => void, isActivityToggled: boolean) {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const handleActivityChange = (newActivity: Activity | null) => {
    if (newActivity !== null && selectedActivity === null) {
      setSelectedActivity(newActivity);
      toggleActivity();
      return;
    }

    if (newActivity !== null && selectedActivity !== null && isActivityToggled) {
      setSelectedActivity(newActivity);
      toggleActivity();
      return;
    }

    if (newActivity !== null && selectedActivity !== null && !isActivityToggled) {
      setSelectedActivity(newActivity);
      return;
    }

    if (newActivity === null && selectedActivity !== null) {
      setSelectedActivity(null);
      toggleActivity();
    }
  };

  const handleTripCreation = () => {
    handleActivityChange(null);
  }

  return (
    <>
      <AppShell.Main>
        <PostsList
          Content={mockActivities.map((activity) => (
            <Group>
              <div>
                <Checkbox />
              </div>

              <ActivityPost key={activity.id} data={activity} onSelect={(data: Activity | null) => {handleActivityChange(data)}}/>
              <Menu shadow="md" position="right">
                <Menu.Target>
                  <Burger/>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Item>
                    Add to trip
                  </Menu.Item>
                  <Menu.Item onClick={handleTripCreation}>
                    Create new trip
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>

          ))}
        />
      </AppShell.Main>

      <AppShell.Aside>
        <ActivityDetails selectedActivity={selectedActivity} handleActivityChange={handleActivityChange} />
      </AppShell.Aside>
    </>
  );
}
