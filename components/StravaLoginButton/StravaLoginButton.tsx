'use client';

import Image from 'next/image';
import { UnstyledButton } from '@mantine/core';
import { openOAuthPopup } from '@/lib/strava/oauth/popup';

type ButtonSize = '1x' | '2x' | 'custom';

interface StravaLoginButtonProps {
  onAuthCode: (code: string) => void;
  size?: ButtonSize;
  height?: number;
}

function getImageSrc(size: ButtonSize, height?: number): string {
  if (size === '2x') {
    return '/btn_strava_connect_with_orange_x2.svg';
  }
  if (size === 'custom' && height !== undefined && height > 72) {
    return '/btn_strava_connect_with_orange_x2.svg';
  }
  return '/btn_strava_connect_with_orange.svg';
}

export function StravaLoginButton({ onAuthCode, size = '1x', height }: StravaLoginButtonProps) {
  const imgSrc = getImageSrc(size, height);

  function handleClick() {
    openOAuthPopup({
      authUrl: '/api/strava/auth',
      windowName: 'StravaLogin',
      onCode: onAuthCode,
    });
  }

  return (
    <UnstyledButton onClick={handleClick} aria-label="Connect with Strava">
      <Image src={imgSrc} alt="Connect with Strava" width={193} height={48} />
    </UnstyledButton>
  );
}
