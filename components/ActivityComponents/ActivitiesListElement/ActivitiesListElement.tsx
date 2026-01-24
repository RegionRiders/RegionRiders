'use client';

import {useEffect, useMemo, useState} from "react";
import InfiniteScroll from "react-infinite-scroll-component";
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
  ScrollArea,
  Stack,
  Text,
  TextInput
} from "@mantine/core";
import { useForm } from '@mantine/form';
import { useDisclosure } from "@mantine/hooks";
import ActivityDetails from "@/components/ActivityComponents/ActivityDetails/ActivityDetails";
import { ActivityPost } from '@/components/ActivityComponents/ActivityPost/ActivityPost';
import { PostsList } from '@/components/PostsList/PostsList';
import { PostsLoading } from "@/components/PostsList/PostsLoading";
import { dateWithTime } from "@/components/Utils/DateFormattingFunctions";
import { mockActivities } from '@/lib/mockData';
import { Activity } from "@/types/activity";
import classes from "./ActivitiesListElement.module.css";


export function ActivitiesListElement(toggleActivity: () => void, isActivityToggled: boolean) {

  const getActivityById = (activities: Activity[], activityId: string) => (
    activities.find((activity) => activity.id === activityId)!
  )

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
  const tripForm = useForm({
    mode: "uncontrolled",
    initialValues: {
      tripName: '',
    },

    validate: {
      tripName: (value) => (value.length < 2) ? "Name Your Trip!" : null,
    },
  })

  const toggleTripCreation = (activityId?: string) => {
    handleActivityChange(null);
    setTripCreationMode(true);

    if (activityId !== undefined) {
      setSelectedActivities((prev) => [...prev, getActivityById(visibleActivities, activityId)])
    }
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


  
  const ActivityPostMenu = ({activityId}: {activityId: string}) => (
    <div hidden={tripCreationMode}>
      <Menu shadow="md" position="right">
        <Menu.Target>
          <Burger />
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item>Add to trip</Menu.Item>
          <Menu.Item onClick={() => toggleTripCreation(activityId)}>Create new trip</Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  );
  
  const ActivitySelectCheckbox = ({ activityId }: { activityId: string }) => {
    const correspondingActivity = getActivityById(visibleActivities, activityId);
    const removeElement = () => {
      setSelectedActivities(l => l.filter(a => a.id !== activityId));
    }
    const isChecked = () => selectedActivities.includes(correspondingActivity);

    return (
      <div hidden={!tripCreationMode}>
        <Checkbox
          checked={isChecked()}
          onChange={() =>
            {
              if (isChecked()) {
                removeElement();
              } else {
                setSelectedActivities((prev) => [...prev, correspondingActivity])
              }
            }
          }
        />
      </div>
    );
  };

  const TripCreationMenu = () => {
    const sortedSelectedActivities = [...selectedActivities].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

    return (
      <>
        <Modal.Root
          opened={tripCreationMenuOpened}
          onClose={tripCreationMenuHandlers.close}
        >
          <Modal.Overlay/>

          <Modal.Content>
            <Modal.Header>
              <Modal.Title>
                <Text size="lg" fw={700}>Create Trip</Text>
              </Modal.Title>
              <Modal.CloseButton />
            </Modal.Header>

            <Modal.Body>
              <form onSubmit={tripForm.onSubmit(console.log)}>
                <Stack gap="md">

                  <TextInput
                    label="Trip Name"
                    placeholder="An amazing trip!"
                    {...tripForm.getInputProps('tripName')}
                  />

                  <Group>
                    <Text>
                      {selectedActivities.length
                        ? dateWithTime(sortedSelectedActivities[0].startDate)
                        : null}
                    </Text>
                    -
                    <Text>
                      {selectedActivities.length
                        ? dateWithTime(
                          sortedSelectedActivities[sortedSelectedActivities.length - 1].startDate
                        )
                        : null}
                    </Text>
                  </Group>

                  <ScrollArea h="4rem">
                    {selectedActivities.map((activity) => (
                      <Text key={activity.id}>{activity.title}</Text>
                    ))}
                  </ScrollArea>

                  <Button fullWidth variant="filled" type="submit">Create Trip!</Button>
                </Stack>
              </form>
          </Modal.Body>
        </Modal.Content>
        </Modal.Root>
      </>
    );
  };

  return (
    <>
      {TripCreationMenu()}

      <div className={classes.tripCreationSection} hidden={!tripCreationMode}>
        <Group h="4rem" mx="10px">
          <CloseButton size="xl" onClick={() => setTripCreationMode(false)}/>

          <Button variant="filled" onClick={tripCreationMenuHandlers.open} ml="auto" disabled={selectedActivities.length === 0}>
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
                <ActivitySelectCheckbox activityId={activity.id}/>

                <ActivityPost
                  data={activity}
                  onSelect={(data: Activity | null) => {
                    handleActivityChange(data);
                  }}
                />

                <ActivityPostMenu activityId={activity.id}/>
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
