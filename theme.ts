'use client';

import { createTheme } from '@mantine/core';

export const theme = createTheme({
  colors: {
    brand: [
      '#e6f7ef', // lightest - for backgrounds
      '#c2ebd7',
      '#9ddfbf',
      '#78d3a7',
      '#52c78f',
      '#0a7e43', // your main brand color (index 5)
      '#096e3a', // slightly darker
      '#085e31',
      '#064e28',
      '#053e1f', // darkest - for text/borders
    ],
  },
  primaryColor: 'brand',
  defaultRadius: 'md',
});
