'use client';

import dynamic from 'next/dynamic';

const ActivityMapComponent = dynamic(() => import('@/components/ActivityMap/ActivityMap'), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <p className="text-gray-400">Loading map...</p>
    </div>
  ),
});

export default function Home() {
  return <ActivityMapComponent />;
}
