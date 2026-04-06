'use client';

import React, {ReactElement, useState} from 'react';
import { AppShell, Tabs, Text } from '@mantine/core';
import { ActivitiesListElement } from '@/components/ActivityComponents/ActivitiesListElement/ActivitiesListElement';
import { Logo } from '@/components/Logo/Logo';
import { StravaLoginButton } from '@/components/StravaLoginButton/StravaLoginButton';
import { TripsListElement } from '@/components/TripComponents/TripsListElement/TripsListElement';
import { Welcome } from '@/components/Welcome/Welcome';
import { User } from '@/types/user';
import { UserMenu } from './UserMenu';
import classes from './Navbar.module.css';
import {useDisclosure} from "@mantine/hooks";


export interface NavbarProps {
  user?: User;
  defaultTab?: 'welcome' | 'map' | 'activities' | 'trips';
  onLoginClick?: () => void;
}

const NavbarTab = ({ value, text, display }: { value: string; text: string; display?: "none" | "flex" }) => (
  <Tabs.Tab value={value} display={display}>
    <Text>{text}</Text>
  </Tabs.Tab>
);

const NavbarTabContent = ({ value, Content }: { value: string; Content: ReactElement }) => (
  <Tabs.Panel value={value}>
    {Content}
  </Tabs.Panel>
);

/**
 * Render the application's responsive navigation shell with tabbed views and user/login controls.
 *
 * The component provides four tabs ("welcome", "map", "activities", "trips"), an adaptive aside whose width changes per active tab, and a right-side area that shows a user menu when `user` is present or a Strava login button otherwise.
 *
 * @param user - Optional authenticated user. When not provided, the "map", "activities", and "trips" tabs are hidden and the default active tab becomes `"welcome"`.
 * @param defaultTab - Initial active tab; defaults to `"welcome"` when `user` is undefined and `"map"` when `user` is present.
 * @returns The AppShell containing the Tabs list, header, aside, and tab panels for the application navigation.
 */
export function Navbar({ user, defaultTab = user === undefined ? "welcome" : "map" }: NavbarProps) {
  /** Stores the OAuth authorization code received from Strava */
  const [, setAuthCode] = useState<string | null>(null);

const getAsideWidth = (tab: string | null) => {
  switch (tab) {
    case 'welcome':
      return { base: 0 };
    case 'map':
      return { base: 0 };
    case 'activities':
      return { base: '100%', md: 500, xl: 700 };
    case 'trips':
      return { base: '100%', sm: '45vw', md: '50vw' };
    default:
      return { base: 0 };
  }
};

  const [asideWidth, setAsideWidth] = useState<{
    base: string | number,
    xs?: string | number,
    sm?: string | number,
    md?: string | number,
    lg?: string | number,
    xl?: string | number}>
  (() => getAsideWidth(defaultTab));

  const [hideNavbar, setHideNavbar] = useState<boolean>(false);

  const [, { toggle: toggleAsideMobile }] = useDisclosure(true);
  const [desktopAsideOpened, { toggle: toggleAsideDesktop }] = useDisclosure(true);

  const changeContentWidth = (activeTab: string | null) => {
    setAsideWidth(getAsideWidth(activeTab));

    if (!desktopAsideOpened) {
      toggleAsideDesktop();
      toggleAsideMobile();
    }
  }

  return (
    <Tabs defaultValue={defaultTab} onChange={(value) => changeContentWidth(value)}>
      <AppShell header={{ height: "4rem" }}
                aside={{
                  width: asideWidth,
                  breakpoint: 'sm',
                  collapsed: {mobile: desktopAsideOpened, desktop: desktopAsideOpened} }}
                >
        <AppShell.Header display={hideNavbar ? 'none' : ''}>
          <Tabs.List h="4rem">
            <Logo />
            <NavbarTab value="welcome" text="" display="none"/>
            <NavbarTab value="map" text="Map" display={user === undefined ? 'none' : 'flex'}/>
            <NavbarTab value="activities" text="Activities" display={user === undefined ? 'none' : 'flex'}/>
            <NavbarTab value="trips" text="Trips" display={user === undefined ? 'none' : 'flex'}/>

            <div className={classes.userSection}>
              {user ? <UserMenu user={user} /> : <StravaLoginButton onAuthCode={setAuthCode} />}
            </div>
          </Tabs.List>
        </AppShell.Header>

        <NavbarTabContent value="welcome" Content={Welcome()} />
        <NavbarTabContent value="map" Content={<Text m="100">here will be map</Text>} />
        <NavbarTabContent value="activities" Content={<ActivitiesListElement toggleActivity={toggleAsideDesktop} isActivityToggled={desktopAsideOpened} hideNavbar={setHideNavbar} />} />
        <NavbarTabContent value="trips" Content={<TripsListElement toggleTrip={toggleAsideDesktop} isTripToggled={desktopAsideOpened} />} />
      </AppShell>
    </Tabs>
  );
}