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
  defaultTab?: 'map' | 'activities' | 'trips';
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

export function Navbar({ user, defaultTab = 'map' }: NavbarProps) {
  /** Stores the OAuth authorization code received from Strava */
  const [, setAuthCode] = useState<string | null>(null);

  const [asideWidth, setAsideWidth] = useState<{
    base: string | number,
    xs?: string | number,
    sm?: string | number,
    md?: string | number,
    lg?: string | number,
    xl?: string | number}>
  ({base: 0, xs: 0, sm: 0, md: 0, lg: 0, xl: 0});

  const [hideNavbar, setHideNavbar] = useState<boolean>(false);

  const [, { toggle: toggleAsideMobile }] = useDisclosure(true);
  const [desktopAsideOpened, { toggle: toggleAsideDesktop }] = useDisclosure(true);

  const changeContentWidth = (activeTab: string | null) => {
    switch (activeTab) {
      case 'map':
        setAsideWidth({base: 0});
        break;
      case 'activities':
        setAsideWidth({base: "100%", md: 500, xl: 700});
        break;
      case 'trips':
        setAsideWidth({base: "100%", sm: "50vw"});
        break;
      default:
        setAsideWidth({base: 0});
        break;
    }

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
          <Tabs.List className={classes.tabsList} h="4rem">
            <Logo />
            <NavbarTab value="map" text="Map" />
            <NavbarTab value="activities" text="Activities" display={user === undefined ? "none" : "flex"} />
            <NavbarTab value="trips" text="Trips" display={user === undefined ? "none" : "flex"} />

            <div className={classes.userSection}>
              {user ? <UserMenu user={user} /> : <StravaLoginButton onAuthCode={setAuthCode} />}
            </div>
          </Tabs.List>
        </AppShell.Header>


        <NavbarTabContent value="map" Content={Welcome()} />
        <NavbarTabContent value="activities" Content={<ActivitiesListElement toggleActivity={toggleAsideDesktop} isActivityToggled={desktopAsideOpened} hideNavbar={setHideNavbar} />} />
        <NavbarTabContent value="trips" Content={<TripsListElement toggleTrip={toggleAsideDesktop} isTripToggled={desktopAsideOpened} />} />
      </AppShell>
    </Tabs>
  );
}