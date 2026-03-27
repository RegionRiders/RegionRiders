'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';

const ActivityMapComponent = dynamic(() => import('@/components/ActivityMap/ActivityMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-gray-900 px-6">
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-gray-700/70 bg-gray-800/70 p-8 text-center shadow-2xl">
        <Image alt="RegionRiders logo" height={64} src="/favicon.svg" width={64} />
        <p className="text-2xl font-semibold text-gray-100">Map is loading</p>
        <p className="text-base text-gray-300">Please wait while we prepare your ride data.</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <ActivityMapComponent />;
}
