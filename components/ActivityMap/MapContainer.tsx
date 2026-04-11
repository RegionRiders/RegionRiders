/**
 * Map container component
 * Provides a styled div element for mounting Leaflet maps
 */

import { forwardRef } from 'react';
import styles from './MapContainer.module.css';

/**
 * MapContainer renders the DOM element that Leaflet attaches to
 * Forwards ref to allow useLeafletMap hook to initialize the map
 */
const MapContainer = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    return <div ref={ref} className={styles.mapContainer} {...props} />;
  }
);

MapContainer.displayName = 'MapContainer';

export default MapContainer;
