'use client';

import React, { useState } from 'react';
import { Tabs, Text } from '@mantine/core';
import { ActivitiesListElement } from '@/components/ActivitiesListElement/ActivitiesListElement';
import { Logo } from '@/components/Logo/Logo';
import { StravaLoginButton } from '@/components/StravaLoginButton/StravaLoginButton';
import { TripsListElement } from '@/components/TripsListElement/TripsListElement';
import { Welcome } from '@/components/Welcome/Welcome';
import { User } from '@/types/user';
import { UserMenu } from './UserMenu';
import classes from './Navbar.module.css';

export interface NavbarProps {
  user?: User;
  defaultTab?: 'map' | 'activities' | 'trips';
  onLoginClick?: () => void;
}

const NavbarText = ({ text }: { text: string }) => <Text>{text}</Text>;

const NavbarTab = ({ value, text }: { value: string; text: string }) => (
  <Tabs.Tab value={value}>
    <NavbarText text={text} />
  </Tabs.Tab>
);

const NavbarTabContent = ({ value, Content }: { value: string; Content: React.ComponentType }) => (
  <Tabs.Panel value={value}>
    <Content />
  </Tabs.Panel>
);

export function Navbar({ user, defaultTab = 'map' }: NavbarProps) {
  /** Stores the OAuth authorization code received from Strava */
  const [, setAuthCode] = useState<string | null>(null);

  return (
    <Tabs defaultValue={defaultTab}>
      <Tabs.List className={classes.tabsList}>
        <Logo />
        <NavbarTab value="map" text="Map" />
        <NavbarTab value="activities" text="Activities" />
        <NavbarTab value="trips" text="Trips" />

        <div className={classes.userSection}>
          {user ? <UserMenu user={user} /> : <StravaLoginButton onAuthCode={setAuthCode} />}
        </div>
      </Tabs.List>

      <NavbarTabContent value="map" Content={Welcome} />
      <NavbarTabContent value="activities" Content={ActivitiesListElement} />
      <NavbarTabContent value="trips" Content={TripsListElement} />
    </Tabs>
  );
}
