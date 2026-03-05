'use client';

import React from 'react';
import { Stack } from '@mantine/core';

export function PostsList({ Content }: { Content: React.ReactNode }) {
  return (
    <>
      <Stack align="center" justify="flex-start" py="md">
        {Content}
      </Stack>
    </>
  );
}
