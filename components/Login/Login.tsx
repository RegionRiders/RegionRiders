import React, { useState } from 'react';
import { Container, Paper, Text, Title } from '@mantine/core';
import { StravaLoginButton } from '@/components/StravaLoginButton/StravaLoginButton';
import styles from './Login.module.css';

/**
 * Login modal component for Strava OAuth authentication
 *
 * Displays a modal overlay with a Strava "Connect with Strava" button
 * for user authentication. The modal can be closed by clicking the X button
 * and manages the OAuth authorization code state.
 *
 * @component
 */
const Login: React.FC = () => {
  /** Controls the visibility of the login modal */
  const [isOpen, setIsOpen] = useState(true);

  /** Stores the OAuth authorization code received from Strava */
  const [, setAuthCode] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay}>
      <Container size="xs">
        <Paper withBorder shadow="md" radius="md" className={styles.card}>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => setIsOpen(false)}
            aria-label="Close modal"
          >
            ×
          </button>

          <div className={styles.stack}>
            <Title order={2} className={styles.title}>
              Welcome Athlete!
            </Title>

            <Text className={styles.dimmedText}>Log in to connect your Strava account</Text>

            <StravaLoginButton onAuthCode={setAuthCode} />
          </div>
        </Paper>
      </Container>
    </div>
  );
};

export default Login;
