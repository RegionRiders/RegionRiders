'use client';

import { useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { AppShell, ScrollArea } from '@mantine/core';
import PostDetails from '@/components/PostDetails/PostDetails';
import { PostsList } from '@/components/PostsList/PostsList';
import { PostsLoading } from '@/components/PostsList/PostsLoading';
import { TripPost } from '@/components/TripComponents/TripPost/TripPost';
import { mockTrips } from '@/lib/mockData';
import { Activity } from '@/types/activity';
import { Trip } from '@/types/trip';

/**
 * Render a paginated list of trip posts with selection handling and a details pane.
 *
 * Manages currently selected trip and appends more trips via infinite scroll; coordinates opening and closing the details view by calling `toggleTrip` according to the component's selection rules.
 *
 * @param toggleTrip - Callback invoked to open or close the trip details pane
 * @param isTripToggled - Current open/closed state of the trip details pane
 * @returns A React element containing the infinite-scrolling trips list and an aside showing the selected trip's details
 */
export function TripsListElement({
  togglePost,
  isPostToggled,
}: {
  togglePost: () => void;
  isPostToggled: boolean;
}) {
  const [selectedPostData, setSelectedPostData] = useState<Trip | Activity | null>(null);
  const [selectedPostType, setSelectedPostType] = useState<'Activity' | 'Trip' | null>(null);

  const handlePostSelect = (newPostData: Trip | Activity | null) => {
    if (newPostData !== null && selectedPostData === null) {
      setSelectedPostData(newPostData);
      togglePost();
      return;
    }

    if (newPostData !== null && selectedPostData !== null && isPostToggled) {
      setSelectedPostData(newPostData);
      togglePost();
      return;
    }

    if (newPostData !== null && selectedPostData !== null && !isPostToggled) {
      setSelectedPostData(newPostData);
      return;
    }

    if (newPostData === null && selectedPostData !== null) {
      setSelectedPostData(null);
      togglePost();
    }
  };

  const postsAmountPerLoad = 2;
  const [visibleTrips, setVisibleTrips] = useState<Trip[]>(mockTrips.slice(0, postsAmountPerLoad));
  const [hasMoreTrips, setHasMoreTrips] = useState<boolean>(true);

  const fetchTrips = () => {
    setTimeout(() => {
      const nextTrips = mockTrips.slice(
        visibleTrips.length,
        visibleTrips.length + postsAmountPerLoad
      );

      setVisibleTrips((prev) => [...prev, ...nextTrips]);

      if (visibleTrips.length + nextTrips.length >= mockTrips.length) {
        setHasMoreTrips(false);
      }
    }, 1500);
  };

  return (
    <>
      <AppShell.Main>
        <InfiniteScroll
          next={fetchTrips}
          hasMore={hasMoreTrips}
          loader={<PostsLoading />}
          dataLength={visibleTrips.length}
          style={{ overflow: 'hidden' }}
        >
          <PostsList
            Content={visibleTrips.map((trip) => (
              <TripPost
                key={trip.id}
                data={trip}
                onSelect={(data: Trip | Activity, postType: 'Activity' | 'Trip' | null) => {
                  handlePostSelect(data);
                  setSelectedPostType(postType);
                }}
              />
            ))}
          />
        </InfiniteScroll>
      </AppShell.Main>

      <AppShell.Aside>
        <ScrollArea h="100%">
          <PostDetails
            selectedPost={selectedPostData}
            postType={selectedPostType}
            handlePostChange={() => {
              handlePostSelect(null);
              setSelectedPostType(null);
            }}
          />
        </ScrollArea>
      </AppShell.Aside>
    </>
  );
}
