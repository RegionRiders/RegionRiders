'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';

const ActivityMapComponent = dynamic(() => import('@/components/ActivityMap/ActivityMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          background: 'var(--mantine-color-brand-5)',
          border: '5px solid white',
          borderRadius: '5px',
          padding: '40px',
          maxWidth: '512px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <Image alt="RegionRiders logo" height={80} priority src="/favicon.svg" width={80} />
        <h1 style={{ fontSize: '2.25rem', fontWeight: 600, color: '#f3f4f6', margin: 0 }}>
          Map is loading...
        </h1>
      </div>
    </div>
  ),
});

export default function Home() {
  return <ActivityMapComponent />;
}
