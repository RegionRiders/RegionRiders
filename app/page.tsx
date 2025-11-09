'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const ActivityMapComponent = dynamic(
    () => import('@/components/ActivityMap/ActivityMapComponent'),
    { ssr: false }
);

export default function Home() {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);


    if (!isClient) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
                <div>🗺️ Loading map...</div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', height: '100vh' }}>
            <div style={{ flex: 1 }}>
                <ActivityMapComponent />
            </div>
        </div>
    );
}
