import type { Meta, StoryObj } from '@storybook/nextjs';

import { Login } from './Login';


const meta = {
  component: Login,
} satisfies Meta<typeof Login>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};