'use client';

import React from 'react';
import Image from 'next/image';
import { getAuthorizationUrl } from '@/lib/strava/oauth/getAuthUrl';
import { openOAuthPopup } from '@/lib/strava/oauth/popup';
import styles from './StravaLoginButton.module.css';

/**
 * Props for the StravaLoginButton component
 */
interface StravaLoginButtonProps {
  /** Callback function invoked when the OAuth authorization code is received */
  onAuthCode: (code: string) => void;
  /**
   * Size variant of the button
   * - '1x': Standard size (237x48px) - uses btn_strava_connect_with_orange.svg
   * - '2x': Retina/high-res size (474x96px) - uses btn_strava_connect_with_orange_x2.svg
   * - 'custom': Custom height (requires height prop)
   * @default '1x'
   */
  size?: '1x' | '2x' | 'custom';
  /**
   * Custom height in pixels (only used when size='custom')
   * Automatically selects the appropriate SVG:
   * - height ≤ 72px: uses 1x SVG
   * - height > 72px: uses 2x SVG
   * Width is calculated automatically to maintain aspect ratio (237:48)
   */
  height?: number;
}

const BUTTON_CONFIG = {
  '1x': {
    src: '/assets/btn_strava_connect_with_orange.svg',
    width: 237,
    height: 48,
  },
  '2x': {
    src: '/assets/btn_strava_connect_with_orange_x2.svg',
    width: 474,
    height: 96,
  },
} as const;

const ASPECT_RATIO = 237 / 48;

/**
 * Strava "Connect with Strava" OAuth button component
 *
 * Renders an official Strava branded button that initiates OAuth authentication
 * via a popup window. Follows Strava's brand guidelines with official button assets.
 *
 * @param props - Component props
 * @param props.onAuthCode - Callback invoked with the authorization code after successful auth
 * @param props.size - Button size variant: '1x' (48px), '2x' (96px), or 'custom'
 * @param props.height - Custom height in pixels (only when size='custom')
 *
 * @example
 * ```
 * // Standard size (48px height)
 * <StravaLoginButton onAuthCode={(code) => handleAuth(code)} />
 *
 * // Large size (96px height)
 * <StravaLoginButton onAuthCode={handleAuth} size="2x" />
 *
 * // Custom size with automatic SVG selection
 * <StravaLoginButton onAuthCode={handleAuth} size="custom" height={60} />
 * ```
 *
 * @see {@link https://developers.strava.com/guidelines/ Strava Brand Guidelines}
 */
export const StravaLoginButton: React.FC<StravaLoginButtonProps> = ({
  onAuthCode,
  size = '1x',
  height,
}) => {
  let src: string;
  let width: number;
  let finalHeight: number;

  if (size === 'custom' && height) {
    // Choose the SVG closest to the requested height
    // Threshold is 72px (midpoint between 48 and 96)
    const useHighRes = height > 72;
    src = useHighRes ? BUTTON_CONFIG['2x'].src : BUTTON_CONFIG['1x'].src;

    finalHeight = height;
    width = Math.round(height * ASPECT_RATIO);
  } else {
    const config = BUTTON_CONFIG[size === 'custom' ? '1x' : size];
    src = config.src;
    width = config.width;
    finalHeight = config.height;
  }

  const handleStravaLogin = () => {
    const authUrl = getAuthorizationUrl();

    if (!authUrl) {
      // eslint-disable-next-line no-console
      console.error(
        'Strava OAuth is not configured. Please set the required environment variables.'
      );
      return;
    }

    openOAuthPopup({
      authUrl,
      windowName: 'StravaLogin',
      onCode: onAuthCode,
    });
  };

  return (
    <button
      type="button"
      onClick={handleStravaLogin}
      className={styles.button}
      aria-label="Connect with Strava"
    >
      <Image src={src} alt="Connect with Strava" width={width} height={finalHeight} />
    </button>
  );
};
