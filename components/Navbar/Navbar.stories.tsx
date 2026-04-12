import type { Meta, StoryObj } from '@storybook/nextjs';
import { mockUsers } from '@/lib/mockData';
import { Navbar } from './Navbar';

const meta = {
  component: Navbar,
  title: 'Navigation/Navbar',
  tags: ['autodocs'],
  argTypes: {
    user: {
      description: 'User object when logged in, undefined when logged out',
    },
    defaultTab: {
      description: 'Default active tab',
      control: 'select',
      options: ['map', 'activities', 'trips'],
    },
    onLoginClick: {
      description: 'Callback fired when login button is clicked',
      action: 'login clicked',
    },
  },
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof Navbar>;

// logged in user viewing map tab
export const LoggedIn: Story = {
  args: {
    user: mockUsers.mlody,
    defaultTab: 'map',
  },
};

// logged out state showing login button
export const LoggedOut: Story = {
  args: {
    user: undefined,
  },
};

// different user example
export const DifferentUser: Story = {
  args: {
    user: mockUsers.andrzej,
    defaultTab: 'trips',
  },
};
