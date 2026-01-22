'use client';

import { useState } from "react";
import { AppShell, Burger, Checkbox, Group, Menu } from "@mantine/core";
import ActivityDetails from "@/components/ActivityComponents/ActivityDetails/ActivityDetails";
import { ActivityPost } from '@/components/ActivityComponents/ActivityPost/ActivityPost';
import { PostsList } from '@/components/PostsList/PostsList';
import { mockActivities } from '@/lib/mockData';
import { Activity } from "@/types/activity";


export function ActivitiesListElement(toggleActivity: () => void, isActivityToggled: boolean) {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [tripCreation, setTripCreation] = useState<boolean>(false);

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
    setTripCreation(true);
  }
  
  const ActivityPostMenu = () => (
    <div hidden={tripCreation}>
      <Menu shadow="md" position="right">
        <Menu.Target>
          <Burger />
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item>Add to trip</Menu.Item>
          <Menu.Item onClick={handleTripCreation}>Create new trip</Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  );
  
  const ActivitySelectCheckbox = () => (
    <div hidden={!tripCreation}>
      <Checkbox />
    </div>
  );

  return (
    <>
      <AppShell.Main>
        <PostsList
          Content={mockActivities.map((activity) => (
            <Group key={activity.id}>
              <ActivitySelectCheckbox />

              <ActivityPost
                data={activity}
                onSelect={(data: Activity | null) => {
                  handleActivityChange(data);
                }}
              />

              <ActivityPostMenu />
            </Group>
          ))}
        />
      </AppShell.Main>

      <AppShell.Aside>
        <ActivityDetails
          selectedActivity={selectedActivity}
          handleActivityChange={handleActivityChange}
        />
      </AppShell.Aside>
    </>
  );
}
