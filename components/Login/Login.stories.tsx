
import { Meta, StoryObj } from '@storybook/react';
import Login from './Login'; // import the default export component

// Default export with component annotation
const meta: Meta<typeof Login> = {
  title: 'Pages/Login',
  component: Login, // <- this is required
};

export default meta;

// Story type
type Story = StoryObj<typeof Login>;

// Named story
export const Default: Story = {};
