import { forwardRef } from 'react';
import styles from './MapContainer.module.css';

const MapContainer = forwardRef<HTMLDivElement>((props, ref) => {
    return (
        <div
            ref={ref}
            className={styles.mapContainer}
            {...props}
        />
    );
});

MapContainer.displayName = 'MapContainer';

export default MapContainer;
