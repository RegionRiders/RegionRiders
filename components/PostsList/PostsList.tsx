'use client';

import React from 'react';
import { Stack } from '@mantine/core';

/**
 * Renders the provided content inside a vertically stacked container centered horizontally.
 *
 * @param Content - The React node to display inside the stack
 * @returns A JSX element containing `Content` wrapped in a Mantine `Stack` with center alignment and medium vertical padding
 */
export function PostsList({ Content }: { Content: React.ReactNode }) {
  return (
    <>
      <Stack align="center" justify="flex-start" py="md">
        {Content}
      </Stack>
    </>
  );
}
