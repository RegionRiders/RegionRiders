'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import styles from './MapStyleButton.module.css';

interface MapStyleButtonProps {
  imageUrl?: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  active?: boolean;
  fullWidth?: boolean;
  'aria-label'?: string;
}

export default function MapStyleButton({
  imageUrl = 'https://a.tile.opentopomap.org/12/2260/1307.png',
  label,
  onClick,
  active = false,
  fullWidth = false,
  'aria-label': ariaLabel = 'Toggle panel',
}: MapStyleButtonProps) {
  const [displayedUrl, setDisplayedUrl] = useState(imageUrl);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [fadeIn, setFadeIn] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const transitionStateRef = useRef({ incomingDone: false, outgoingDone: false });
  const pendingUrlRef = useRef(imageUrl);
  const prevUrlRef = useRef(imageUrl);

  const hasImage = useCallback((url?: string | null) => Boolean(url && url.trim().length > 0), []);

  const tryFinalizeTransition = useCallback(() => {
    if (!transitionStateRef.current.incomingDone || !transitionStateRef.current.outgoingDone) {
      return;
    }

    setDisplayedUrl(pendingUrlRef.current);
    setNextUrl(null);
    setFadeIn(false);
    setFadeOut(false);
  }, []);

  useEffect(() => {
    if (imageUrl !== prevUrlRef.current) {
      const previousUrl = prevUrlRef.current;
      prevUrlRef.current = imageUrl;

      pendingUrlRef.current = imageUrl;
      setFadeIn(false);
      setFadeOut(false);

      const previousHasImage = hasImage(previousUrl);
      const nextHasImage = hasImage(imageUrl);

      transitionStateRef.current = {
        incomingDone: !nextHasImage,
        outgoingDone: !previousHasImage,
      };

      if (!previousHasImage) {
        setDisplayedUrl(imageUrl);
        setNextUrl(null);
        return;
      }

      if (nextHasImage) {
        setNextUrl(imageUrl);
      } else {
        setNextUrl(null);
        requestAnimationFrame(() => {
          setFadeOut(true);
        });
      }
    }
  }, [hasImage, imageUrl]);

  const handleNextLoaded = useCallback(() => {
    // Delay by one frame so the browser paints opacity:0 before transitioning
    // to opacity:1 — ensures the CSS transition fires even for cached images.
    requestAnimationFrame(() => {
      setFadeIn(true);
      setFadeOut(true);
    });
  }, []);

  const handleNextTransitionEnd = useCallback(() => {
    transitionStateRef.current.incomingDone = true;
    tryFinalizeTransition();
  }, [tryFinalizeTransition]);

  const handleCurrentTransitionEnd = useCallback(() => {
    transitionStateRef.current.outgoingDone = true;
    tryFinalizeTransition();
  }, [tryFinalizeTransition]);

  return (
    <button
      type="button"
      className={`${styles.mapStyleButton} ${active ? styles.mapStyleButtonActive : ''} ${fullWidth ? styles.mapStyleButtonFullWidth : ''}`}
      onClick={onClick}
      aria-expanded={active}
      aria-label={ariaLabel}
    >
      <div className={styles.mapStyleButtonImageWrapper}>
        {hasImage(displayedUrl) && (
          <img
            src={displayedUrl}
            alt=""
            className={`${styles.mapStyleButtonImage} ${styles.mapStyleButtonImageCurrent} ${nextUrl || fadeOut ? styles.mapStyleButtonImageCurrentTransition : ''} ${fadeOut ? styles.mapStyleButtonImageFadeOut : ''}`}
            onTransitionEnd={handleCurrentTransitionEnd}
          />
        )}
        {nextUrl && (
          <img
            src={nextUrl}
            alt=""
            className={`${styles.mapStyleButtonImage} ${styles.mapStyleButtonImageNext} ${fadeIn ? styles.mapStyleButtonImageFadeIn : ''}`}
            onLoad={handleNextLoaded}
            onTransitionEnd={handleNextTransitionEnd}
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
