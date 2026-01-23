'use client';

import { useState } from "react";
import {AppShell, Burger, Checkbox, Group, Menu} from "@mantine/core";
import ActivityDetails from "@/components/ActivityComponents/ActivityDetails/ActivityDetails";
import { ActivityPost } from '@/components/ActivityComponents/ActivityPost/ActivityPost';
import { PostsList } from '@/components/PostsList/PostsList';
import {mockActivities} from '@/lib/mockData';
import { Activity } from "@/types/activity";
import InfiniteScroll from "react-infinite-scroll-component";
import {PostsLoading} from "@/components/PostsList/PostsLoading";

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

  const postsAmountPerLoad = 20;
  const [visibleActivities, setVisibleActivities] = useState<Activity[]>(mockActivities.slice(0, postsAmountPerLoad));
  const [hasMoreActivities, setHasMoreActivities] = useState<boolean>(true);

  const fetchActivities = () => {
    setTimeout(() => {
      const nextTrips = mockActivities.slice(visibleActivities.length, visibleActivities.length + postsAmountPerLoad);

      setVisibleActivities(prev => [...prev, ...nextTrips]);

      if (visibleActivities.length + nextTrips.length >= mockActivities.length) {
        setHasMoreActivities(false);
      }
    }, 1500)
  }

  return (
    <>
      <AppShell.Main>
        <InfiniteScroll next={fetchActivities} hasMore={hasMoreActivities} loader={<PostsLoading/>} dataLength={visibleActivities.length} style={{ overflow: "hidden" }}>
          <PostsList
            Content={visibleActivities.map((activity) => (
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
        </InfiniteScroll>
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
