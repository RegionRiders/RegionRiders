'use client';

import React, { forwardRef } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import { Avatar, Box, Group, Text, UnstyledButton } from '@mantine/core';
import { User } from '@/types/user';

export interface UserButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  user: User;
  showChevron?: boolean;
}

export const UserButton = forwardRef<HTMLButtonElement, UserButtonProps>(
  ({ user, showChevron = true, ...others }, ref) => (
    <UnstyledButton ref={ref} {...others}>
      <Group gap="sm">
        <Avatar src={user.profileImage} radius="xl" />

        <Text size="sm" fw={500} display={{ base: 'none', xs: 'flex' }}>
          {user.firstname} {user.lastname}
        </Text>

        <Box display={{ base: 'none', xs: 'flex' }}>
          {showChevron && <IconChevronDown size={16} />}
        </Box>
      </Group>
    </UnstyledButton>
  )
);

UserButton.displayName = 'UserButton';
