'use client';

import { Center, Loader } from '@mantine/core';

export function PostsLoading() {
  return (
    <Center p="xl">
      <Loader />
    </Center>
  );
}
