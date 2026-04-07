'use client';

import { Stack } from '@mantine/core';
import type { ReactNode } from 'react';

interface PostsListProps {
  Content: ReactNode;
}

export function PostsList({ Content }: PostsListProps) {
  return <Stack gap="md">{Content}</Stack>;
}
