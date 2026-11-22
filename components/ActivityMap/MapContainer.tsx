/**
 * Map container component
 * Provides a styled div element for mounting MapLibre GL JS maps
 */

import { forwardRef } from 'react';
import styles from './MapContainer.module.css';

/**
 * MapContainer renders the DOM element that MapLibre GL JS attaches to
 * Forwards ref to allow useMapLibreMap hook to initialize the map
 */
const MapContainer = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    return <div ref={ref} className={styles.mapContainer} {...props} />;
  }
);

MapContainer.displayName = 'MapContainer';

export default MapContainer;
