import React from 'react';
import { Container, Flex, Group, Paper, Stack, Text, Title } from '@mantine/core';
import StravaButton from 'public/assets/btn_strava_connect_with_orange_x2.svg';

export function Login() {
  const CLIENT_ID = "YOUR_CLIENT_ID"; // ← Replace with your actual Strava app's client ID
  const REDIRECT_URI = "https://yourapp.com/strava/callback"; // ← Must match your Strava app settings
  const RESPONSE_TYPE = "code";
  const APPROVAL_PROMPT = "auto"; // or "force"
  const SCOPE = "read,activity:read_all"; // ← Customize based on your app’s needs

  const handleStravaLogin = () => {
    const authUrl =
      `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=${RESPONSE_TYPE}` +
      `&approval_prompt=${APPROVAL_PROMPT}` +
      `&scope=${encodeURIComponent(SCOPE)}`;
    window.location.href = authUrl;
  };

  return (
    <Flex justify="center" align="center" style={{ height: '100vh' }}>
      <Container size="xs" mt="xl">
        {/* Header */}
        <Stack align="center" mb="xl">
          <Title order={2}>Welcome Athlete!</Title>
          <Text c="dimmed">Log in to connect your Strava account</Text>
        </Stack>

        {/* Login Card */}
        <Paper withBorder shadow="sm" p="xl" radius="md">
          <Group>
            <Flex justify="center" w="100%" align="center">
              <button
                type="button"
                onClick={handleStravaLogin}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
                aria-label="Connect with Strava"
              >
                <img
                  src={StravaButton}
                  alt="Connect with Strava"
                  height="96"
                  style={{ display: 'block' }}
                />
              </button>
            </Flex>
          </Group>
        </Paper>
      </Container>
    </Flex>
  );
}
