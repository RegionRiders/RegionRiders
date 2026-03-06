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

const NavbarText = ({ text }: { text: string }) => <Text>{text}</Text>;

const NavbarTab = ({ value, text }: { value: string; text: string }) => (
  <Tabs.Tab value={value}>
    <NavbarText text={text} />
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

  const [asideWidth, setAsideWidth] = useState<string>("0vw");

  const [hideNavbar, setHideNavbar] = useState<boolean>(false);

  const [, { toggle: toggleAsideMobile }] = useDisclosure(true);
  const [desktopAsideOpened, { toggle: toggleAsideDesktop }] = useDisclosure(true);

  const changeContentWidth = (activeTab: string | null) => {
    switch (activeTab) {
      case 'map':
        setAsideWidth("0vw");
        break;
      case 'activities':
        setAsideWidth("50vw");
        break;
      case 'trips':
        setAsideWidth("65vw");
        break;
      default:
        setAsideWidth("0vw");
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
                aside={{ width: asideWidth, breakpoint: 'md', collapsed: {mobile: desktopAsideOpened, desktop: desktopAsideOpened} }}
                >
        <AppShell.Header display={hideNavbar ? 'none' : ''}>
          <Tabs.List className={classes.tabsList} h="4rem">
            <Logo />
            <NavbarTab value="map" text="Map" />
            <NavbarTab value="activities" text="Activities" />
            <NavbarTab value="trips" text="Trips" />

            <div className={classes.userSection}>
              {user ? <UserMenu user={user} /> : <StravaLoginButton onAuthCode={setAuthCode} />}
            </div>
          </Tabs.List>
        </AppShell.Header>


        <NavbarTabContent value="map" Content={Welcome()} />
        <NavbarTabContent value="activities" Content={ActivitiesListElement(toggleAsideDesktop, desktopAsideOpened, setHideNavbar)} />
        <NavbarTabContent value="trips" Content={TripsListElement(toggleAsideDesktop, desktopAsideOpened)} />
      </AppShell>
    </Tabs>
  );
}
