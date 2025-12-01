'use client';

import { IconLogout, IconSettings } from '@tabler/icons-react';
import { Menu } from '@mantine/core';
import { UserButton } from '@/components/Navbar/UserButton';
import { User } from '@/types/user';

export interface UserMenuProps {
  user: User;
  onSettingsClick?: () => void;
  onLogoutClick?: () => void;
}

export function UserMenu({ user, onSettingsClick, onLogoutClick }: UserMenuProps) {
  return (
    <Menu position="bottom" width="target">
      <Menu.Target>
        <UserButton user={user} />
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconSettings size={16} />} onClick={onSettingsClick}>
          Settings
        </Menu.Item>
        <Menu.Item leftSection={<IconLogout size={16} />} color="red" onClick={onLogoutClick}>
          Log out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
