'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { debugLogger } from '@/lib/utils/debugLogger';

const ActivityMapComponent = dynamic(
    () => import('@/components/ActivityMap/ActivityMapComponent'),
    { ssr: false }
);

interface LogEntry {
    message: string;
    timestamp: number;
}

export default function Home() {
    const [debugLogs, setDebugLogs] = useState<LogEntry[]>([]);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        // Subscribe to logger instead of intercepting console
        const unsubscribe = debugLogger.subscribe((logs) => {
            setDebugLogs(logs);
        });

        return unsubscribe;
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
            <div
                style={{
                    width: '300px',
                    backgroundColor: '#1e1e1e',
                    color: '#00ff00',
                    padding: '10px',
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    borderLeft: '1px solid #333',
                }}
            >
                <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>📊 Debug Logs</div>
                {debugLogs.map((log, i) => (
                    <div key={i} style={{ marginBottom: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {log.message}
                    </div>
                ))}
            </div>
        </div>
    );
}
