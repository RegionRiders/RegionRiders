'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import styles from './MapStyleButton.module.css';

interface MapStyleButtonProps {
  imageUrl: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  active?: boolean;
  fullWidth?: boolean;
  'aria-label'?: string;
}

export default function MapStyleButton({
  imageUrl,
  label,
  onClick,
  active = false,
  fullWidth = false,
  'aria-label': ariaLabel = 'Toggle panel',
}: MapStyleButtonProps) {
  const [displayedUrl, setDisplayedUrl] = useState(imageUrl);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [fadeIn, setFadeIn] = useState(false);
  const prevUrlRef = useRef(imageUrl);

  useEffect(() => {
    if (imageUrl !== prevUrlRef.current) {
      prevUrlRef.current = imageUrl;
      setFadeIn(false);
      setNextUrl(imageUrl);
    }
  }, [imageUrl]);

  const handleNextLoaded = useCallback(() => {
    setFadeIn(true);
  }, []);

  const handleTransitionEnd = useCallback(() => {
    if (nextUrl) {
      setDisplayedUrl(nextUrl);
      setNextUrl(null);
      setFadeIn(false);
    }
  }, [nextUrl]);

  return (
    <button
      type="button"
      className={`${styles.mapStyleButton} ${active ? styles.mapStyleButtonActive : ''} ${fullWidth ? styles.mapStyleButtonFullWidth : ''}`}
      onClick={onClick}
      aria-expanded={active}
      aria-label={ariaLabel}
    >
      <div className={styles.mapStyleButtonImageWrapper}>
        <img src={displayedUrl} alt="" className={styles.mapStyleButtonImage} />
        {nextUrl && (
          <img
            src={nextUrl}
            alt=""
            className={`${styles.mapStyleButtonImage} ${styles.mapStyleButtonImageNext} ${fadeIn ? styles.mapStyleButtonImageFadeIn : ''}`}
            onLoad={handleNextLoaded}
            onTransitionEnd={handleTransitionEnd}
          />
        )}
        <div className={styles.mapStyleButtonGradient} />
      </div>
      <div className={styles.mapStyleButtonLabel}>
        <span>{label}</span>
      </div>
    </button>
  );
}
