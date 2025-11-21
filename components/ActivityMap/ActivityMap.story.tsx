/**
 * Storybook story for ActivityMap component
 * Demonstrates the map rendering with different configurations
 */

import ActivityMap from './ActivityMap';

export default {
  title: 'Components/ActivityMap',
  component: ActivityMap,
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * Default ActivityMap showing the map interface
 * Note: This requires browser environment and leaflet to be loaded
 */
export const Default = {
  render: () => <ActivityMap />,
};
