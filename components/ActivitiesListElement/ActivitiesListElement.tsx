'use client';

import { ActivityPost } from '@/components/ActivityPost/ActivityPost';
import { PostsList } from '@/components/PostsList/PostsList';
import { mockActivities } from '@/lib/mockData';
import {AppShell, ScrollArea} from "@mantine/core";

export function ActivitiesListElement() {
  return (
    <>
      <AppShell.Navbar>
        <AppShell.Section component={ScrollArea}>
          <PostsList
            Content={mockActivities.map((activity) => (
              <ActivityPost key={activity.id} data={activity} />
            ))}
          />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Aside>
        hej :3
      </AppShell.Aside>
    </>
  );
}
