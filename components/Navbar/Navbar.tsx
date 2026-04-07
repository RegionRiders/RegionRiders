'use client';

import { Group, Stack, Tabs } from '@mantine/core';
import { Logo } from '@/components/Logo/Logo';
import { StravaLoginButton } from '@/components/StravaLoginButton/StravaLoginButton';
import { Welcome } from '@/components/Welcome/Welcome';
import type { User } from '@/types/user';
import { UserMenu } from './UserMenu';

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
          {user && <Tabs.Tab value="map">Map</Tabs.Tab>}
          {user && <Tabs.Tab value="activities">Activities</Tabs.Tab>}
          {user && <Tabs.Tab value="trips">Trips</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="home">
          <Welcome />
        </Tabs.Panel>
        <Tabs.Panel value="map">{null}</Tabs.Panel>
        <Tabs.Panel value="activities">{null}</Tabs.Panel>
        <Tabs.Panel value="trips">{null}</Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
