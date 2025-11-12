'use client';

import React, { forwardRef} from "react";
import Link from "next/link";
import { Avatar, Group, Image, Menu, Tabs, Text, UnstyledButton } from "@mantine/core";
import { Welcome } from "@/components/Welcome/Welcome";
import {ActivitiesListElement} from "@/components/ActivitiesListElement/ActivitiesListElement";


interface UserButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  image: string;
  name: string;
  icon?: React.ReactNode;
}

const UserButton = forwardRef<HTMLButtonElement, UserButtonProps>(
  ({ image, name, icon, ...others }: UserButtonProps, ref) => (
    <UnstyledButton
      ref={ref}
      style={{
        padding: 'var(--mantine-spacing-md)',
        color: 'var(--mantine-color-text)',
        borderRadius: 'var(--mantine-radius-sm)',
      }}
      {...others}
    >
      <Group>
        <Avatar src={image} radius="xl" />

        <div style={{ flex: 1 }}>
          <Text size="sm" fw="500">
            {name}
          </Text>
        </div>
      </Group>
    </UnstyledButton>
  )
);

const Logo = ({ src, href }: { src: string; href: string }) => (
  <UnstyledButton
    component={Link}
    href={href}
    target="_blank">
    <div style={{ padding: 'var(--mantine-spacing-md)' }}>
      <Image src={src} w={200} />
    </div>
  </UnstyledButton>
);

const NavbarText = ({text} : {text: string}) => (
  <Text size="lg">
    {text}
  </Text>
);

const NavbarTab = ({value, text} : {value: string, text: string}) => (
  <Tabs.Tab value={value}>
    <NavbarText text={text} />
  </Tabs.Tab>
);

const NavbarTabContent = ({value, Content} : {value: string, Content: React.ComponentType}) => (
  <Tabs.Panel value={value}>
    <Content/>
  </Tabs.Panel>
);

export function Navbar() {
  return (
    <>
      <Tabs defaultValue="map">
        <Tabs.List style={{position: 'sticky', top: '0', zIndex: 10, left: '0', right: '0', backgroundColor: 'var(--mantine-color-body)'}}>
          <Logo
            src="https://upload.wikimedia.org/wikipedia/commons/2/23/Logo_Budimex.png"
            href="https://pl.wikipedia.org/wiki/Budimex"
          />

          <NavbarTab value="map" text="Map" />

          <NavbarTab value="trips" text="Trips" />

          <NavbarTab value="activities" text="Activities" />

          <Menu ml="auto" withArrow>
            <Menu.Target>
              <UserButton image="https://http.cat/images/426.jpg" name="Andrzej Lepper" />
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item>Settings</Menu.Item>
              <Menu.Item color="red">Log out</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Tabs.List>

        <NavbarTabContent value="map" Content={Welcome} />
        <NavbarTabContent value="activities" Content={ActivitiesListElement} />
      </Tabs>
    </>
  );
}