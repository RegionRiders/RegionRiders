'use client';

import { Group, Stack, Tabs } from '@mantine/core';
import { Logo } from '@/components/Logo/Logo';
import { StravaLoginButton } from '@/components/StravaLoginButton/StravaLoginButton';
import { Welcome } from '@/components/Welcome/Welcome';
import { UserMenu } from './UserMenu';
import type { User } from '@/types/user';

interface NavbarProps {
  user?: User;
  defaultTab?: string;
  onAuthCode?: (code: string) => void;
}

export function Navbar({ user, defaultTab = 'home', onAuthCode }: NavbarProps) {
  return (
    <Stack gap={0}>
      <Group justify="space-between" p="sm">
        <Logo />
        {user ? (
          <UserMenu user={user} />
        ) : (
          <StravaLoginButton onAuthCode={onAuthCode ?? (() => {})} />
        )}
      </Group>

      <Tabs defaultValue={defaultTab}>
        <Tabs.List>
          <Tabs.Tab value="map" style={!user ? { display: 'none' } : undefined}>
            Map
          </Tabs.Tab>
          <Tabs.Tab value="activities" style={!user ? { display: 'none' } : undefined}>
            Activities
          </Tabs.Tab>
          <Tabs.Tab value="trips" style={!user ? { display: 'none' } : undefined}>
            Trips
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="home">
          <Welcome />
        </Tabs.Panel>
        <Tabs.Panel value="map" />
        <Tabs.Panel value="activities" />
        <Tabs.Panel value="trips" />
      </Tabs>
    </Stack>
  );
}
