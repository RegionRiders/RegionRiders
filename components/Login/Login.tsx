import React, { useState } from 'react';
import Image from 'next/image';
import { Container, Paper, Text, Title } from '@mantine/core';
import styles from './Login.module.css';

const CLIENT_ID = process.env.STRAVA_CLIENT_ID!;
const REDIRECT_URI = process.env.STRAVA_REDIRECT_URI!;
const RESPONSE_TYPE = 'code';
const APPROVAL_PROMPT = 'auto';
const SCOPE = 'read,activity:read_all';

const Login: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [authCode, setAuthCode] = useState<string | null>(null);

  // Log code whenever it changes
  console.log('Strava OAuth code:', authCode);

  const handleStravaLogin = () => {
    const authUrl =
      `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=${RESPONSE_TYPE}` +
      `&approval_prompt=${APPROVAL_PROMPT}` +
      `&scope=${encodeURIComponent(SCOPE)}`;

    const width = 600;
    const height = 700;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'StravaLogin',
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`
    );

    if (!popup) {
      return;
    }

    const interval = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(interval);
          return;
        }

        const url = new URL(popup.location.href);
        const code = url.searchParams.get('code');

        if (code) {
          clearInterval(interval);
          popup.close();
          setAuthCode(code); // triggers useLogger
        }
      } catch (err) {
        // Ignore cross-origin errors until Strava redirects back
      }
    }, 500);
  };

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

            <button
              type="button"
              onClick={handleStravaLogin}
              className={styles.button}
              aria-label="Connect with Strava"
            >
              <Image
                src="/assets/btn_strava_connect_with_orange.svg"
                alt="Connect with Strava"
                width={237}
                height={48}
              />
            </button>
          </div>
        </Paper>
      </Container>
    </div>
  );
};

export default Login;
