'use client';

import { ReactNode } from 'react';
import styles from './MapStyleButton.module.css';

interface MapStyleButtonProps {
  imageUrl: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  active?: boolean;
  'aria-label'?: string;
}

export default function MapStyleButton({
  imageUrl,
  label,
  onClick,
  active = false,
  'aria-label': ariaLabel = 'Toggle panel',
}: MapStyleButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.mapStyleButton} ${active ? styles.mapStyleButtonActive : ''}`}
      onClick={onClick}
      aria-expanded={active}
      aria-label={ariaLabel}
    >
      <div className={styles.mapStyleButtonImageWrapper}>
        <img src={imageUrl} alt="" className={styles.mapStyleButtonImage} />
        <div className={styles.mapStyleButtonGradient} />
      </div>
      <div className={styles.mapStyleButtonLabel}>
        <span>{label}</span>
      </div>
    </button>
  );
}
