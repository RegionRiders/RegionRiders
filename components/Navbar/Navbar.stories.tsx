import type { Meta, StoryObj } from '@storybook/nextjs';

import { Navbar } from './Navbar';

const meta = {
  component: Navbar,
} satisfies Meta<typeof Navbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};