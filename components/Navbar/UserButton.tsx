'use client';

import type React from 'react';
import Image from 'next/image';
import { IconChevronDown } from '@tabler/icons-react';
import { Group, Text, UnstyledButton } from '@mantine/core';
import type { User } from '@/types/user';

interface UserButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  user: User;
  showChevron?: boolean;
}

export function UserButton({ user, showChevron = true, ...props }: UserButtonProps) {
  return (
    <UnstyledButton {...props}>
      <Group gap="xs" align="center">
        {user.profileImage ? (
          <Image
            src={user.profileImage}
            alt={`${user.firstname} ${user.lastname}`}
            width={32}
            height={32}
            style={{ borderRadius: '50%' }}
          />
        ) : (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#ccc',
            }}
          />
        )}
        <Text size="sm">
          {user.firstname} {user.lastname}
        </Text>
        {showChevron && <IconChevronDown size={14} />}
      </Group>
    </UnstyledButton>
  );
}
