'use client';

import { useState } from 'react';
import { Button, Modal, Stack, Text, Title } from '@mantine/core';
import { StravaLoginButton } from '@/components/StravaLoginButton/StravaLoginButton';

interface LoginProps {
  onAuthCode?: (code: string) => void;
}

export default function Login({ onAuthCode }: LoginProps) {
  const [opened, setOpened] = useState(true);

  function handleClose() {
    setOpened(false);
  }

  function handleAuthCode(code: string) {
    onAuthCode?.(code);
  }

  if (!opened) {
    return null;
  }

  return (
    <Modal opened={opened} onClose={handleClose} title={null} withCloseButton={false} centered>
      <Stack align="center" gap="md" p="md">
        <Button
          variant="subtle"
          size="xs"
          onClick={handleClose}
          aria-label="Close modal"
          style={{ alignSelf: 'flex-end' }}
        >
          ✕
        </Button>
        <Title order={2}>Welcome Athlete!</Title>
        <Text ta="center">
          Log in to connect your Strava account and start tracking your rides.
        </Text>
        <StravaLoginButton onAuthCode={handleAuthCode} />
      </Stack>
    </Modal>
  );
}
