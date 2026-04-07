'use client';

import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  href?: string;
  src?: string;
  width?: number;
  height?: number;
  alt?: string;
}

export function Logo({
  href = '/',
  src = '/favicon.svg',
  width = 32,
  height = 32,
  alt = 'RegionRiders Logo',
}: LogoProps) {
  return (
    <Link href={href}>
      <Image src={src} width={width} height={height} alt={alt} />
    </Link>
  );
}
