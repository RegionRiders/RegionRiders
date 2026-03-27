'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';

const ActivityMapComponent = dynamic(() => import('@/components/ActivityMap/ActivityMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-gray-900 px-6">
      <div className="flex w-full max-w-lg flex-col items-center gap-6 rounded-2xl border border-gray-700/70 bg-gray-800/70 p-10 text-center shadow-2xl">
        <Image alt="RegionRiders logo" height={80} priority src="/favicon.svg" width={80} />
        <h1 className="text-4xl font-semibold text-gray-100">Map is loading</h1>
        <h2 className="text-xl font-medium text-gray-300">Please wait while we prepare your ride data.</h2>
      </div>
    </div>
  ),
});

export default function Home() {
  return <ActivityMapComponent />;
}
