'use client';

import { IconChevronDown, IconLogout, IconSettings } from '@tabler/icons-react';
import { Group, Menu, Text, UnstyledButton } from '@mantine/core';
import type { User } from '@/types/user';

interface UserMenuProps {
  user: User;
  onSettingsClick?: () => void;
  onLogoutClick?: () => void;
}

export function UserMenu({ user, onSettingsClick, onLogoutClick }: UserMenuProps) {
  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <UnstyledButton>
          <Group gap="xs" align="center">
            <Text size="sm">
              {user.firstname} {user.lastname}
            </Text>
            <IconChevronDown size={14} />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconSettings size={14} />} onClick={onSettingsClick}>
          Settings
        </Menu.Item>
        <Menu.Item leftSection={<IconLogout size={14} />} onClick={onLogoutClick} color="red">
          Log out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
