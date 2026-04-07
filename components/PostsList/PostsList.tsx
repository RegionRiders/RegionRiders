'use client';

import type { ReactNode } from 'react';
import { Stack } from '@mantine/core';

interface PostsListProps {
  Content: ReactNode;
}

export function PostsList({ Content }: PostsListProps) {
  return <Stack gap="md">{Content}</Stack>;
}
