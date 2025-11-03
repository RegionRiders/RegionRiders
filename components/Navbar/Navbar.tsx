'use client';

import {Avatar, Text, Group, Menu, Tabs, UnstyledButton} from "@mantine/core";
import React, {forwardRef} from "react";

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

export function Navbar() {
  return (
    <>
      <Tabs defaultValue="map">
        <Tabs.List grow>

          <Tabs.Tab value="map">
            Map
          </Tabs.Tab>

          <Tabs.Tab value="trips">
            Trips
          </Tabs.Tab>

          <Tabs.Tab value="activities">
            Activities
          </Tabs.Tab>

          <Menu withArrow>
            <Menu.Target>
              <UserButton
                image="https://http.cat/images/426.jpg"
                name="Harriette Spoonlicker"
              />
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item>
                Settings
              </Menu.Item>
              <Menu.Item color="red">
                Log out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>

        </Tabs.List>
      </Tabs>
    </>
  );
}