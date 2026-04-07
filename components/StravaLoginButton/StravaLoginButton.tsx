'use client';

import Image from 'next/image';
import { UnstyledButton } from '@mantine/core';
import { getAuthorizationUrl } from '@/lib/strava/oauth/getAuthUrl';
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
    // getAuthorizationUrl is mocked synchronously in tests; in production it returns a Promise.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authUrl: string = getAuthorizationUrl() as any;
    if (!authUrl) {
      return;
    }
    openOAuthPopup({
      authUrl,
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
