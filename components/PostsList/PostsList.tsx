'use client';

import {Stack} from "@mantine/core";
import React from "react";

export function PostsList({Content}: {Content: React.ReactNode[]}) {
  return (
    <>
      <Stack
        align="center"
        justify="flex-start"
        gap="md"
      >
        {Content}
      </Stack>
    </>
  )
}