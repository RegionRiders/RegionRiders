import React from 'react';
import { IconBrandStrava } from '@tabler/icons-react';
import { Button, Container, Flex, Group, Paper, Stack, Text, Title } from '@mantine/core';


export function Login() {
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
            <Flex justify="center" w="100%" align="center" >
              <Button
                size="md"
                leftSection={<IconBrandStrava size={20} />}
                color="orange">
                Log in with Strava
              </Button>
            </Flex>
          </Group>
        </Paper>
      </Container>
    </Flex>
  );
}