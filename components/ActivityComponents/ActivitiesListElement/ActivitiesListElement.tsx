'use client';

import { useState } from "react";
import {
  AppShell,
  Burger,
  Button,
  Checkbox,
  CloseButton,
  Divider,
  Group,
  Menu,
  Modal,
  Text,
  TextInput
} from "@mantine/core";
import ActivityDetails from "@/components/ActivityComponents/ActivityDetails/ActivityDetails";
import { ActivityPost } from '@/components/ActivityComponents/ActivityPost/ActivityPost';
import { PostsList } from '@/components/PostsList/PostsList';
import {mockActivities} from '@/lib/mockData';
import { Activity } from "@/types/activity";
import InfiniteScroll from "react-infinite-scroll-component";
import {PostsLoading} from "@/components/PostsList/PostsLoading";
import classes from "./ActivitiesListElement.module.css";
import {useDisclosure} from "@mantine/hooks";
import {dateWithTime} from "@/components/Utils/DateFormattingFunctions";

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



  const [tripCreationMode, setTripCreationMode] = useState<boolean>(false);
  const [tripCreationMenuOpened, tripCreationMenuHandlers] = useDisclosure(false);
  const [selectedActivities, setSelectedActivities] = useState<Activity[]>([]);

  const toggleTripCreation = () => {
    handleActivityChange(null);
    setTripCreationMode(true);
  }

  const createTrip = () => {

  }

  //const openTripCreationMenu =


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


  
  const ActivityPostMenu = () => (
    <div hidden={tripCreationMode}>
      <Menu shadow="md" position="right">
        <Menu.Target>
          <Burger />
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item>Add to trip</Menu.Item>
          <Menu.Item onClick={toggleTripCreation}>Create new trip</Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  );
  
  const ActivitySelectCheckbox = () => (
    <div hidden={!tripCreationMode}>
      <Checkbox/>
    </div>
  );

  const TripCreationMenu = () => {
    // sort oldest to newest
    setSelectedActivities(prev => [...prev].sort((a, b) => a.startDate.getTime() - b.startDate.getTime()))

    return (
      <>
        <Modal opened={tripCreationMenuOpened} onClose={tripCreationMenuHandlers.close} title="Create new trip">
          <TextInput label="Trip Name" />
          <Text>
            {selectedActivities.length ? dateWithTime(selectedActivities[0].startDate) : null}
          </Text>
          <Text>
            {selectedActivities.length ? dateWithTime(selectedActivities[selectedActivities.length - 1].startDate) : null}
          </Text>
        </Modal>
      </>
    )
  }

  return (
    <>
      <TripCreationMenu/>

      <div className={classes.tripCreationSection} hidden={!tripCreationMode}>
        <Group h="4rem" mx="10px">
          <CloseButton size="xl" onClick={() => setTripCreationMode(false)}/>

          <Button variant="filled" onClick={tripCreationMenuHandlers.open} ml="auto">
            Create Trip
          </Button>
        </Group>
        <Divider size="sm" />
      </div>

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
