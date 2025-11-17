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
export const Default = () => <ActivityMap />;

/**
 * Story demonstrating the loading state
 * Shows what users see while the map initializes
 */
export const Loading = () => (
  <div className="h-screen flex items-center justify-center bg-gray-900">
    <p className="text-gray-400">Loading map...</p>
  </div>
);
