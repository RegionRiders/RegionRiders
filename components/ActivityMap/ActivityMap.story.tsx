import { ReactElement, useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { createComponentLogger } from '@/lib/logger/client';
import ActivityMap from './ActivityMap';

type SettingsApiMock = {
  authenticated: boolean;
  saveSucceeds: boolean;
};

type StorybookSettingsMockState = {
  isMockReady: boolean;
  settingsHydrated: boolean;
  getSettingsRequests: number;
  putSettingsRequests: number;
  events: string[];
};

const AUTH_STORY_USER_ID = 'storybook-user';
const AUTH_STORY_STORAGE_KEY = `rr:map-settings:user:${AUTH_STORY_USER_ID}`;
const STORYBOOK_ACTIVITY_MAP_DEBUG_FLAG = '__RR_ACTIVITY_MAP_DEBUG__';
const logger = createComponentLogger('ActivityMap.story');

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

function withSettingsApiMock(settingsApiMock: SettingsApiMock) {
  return function SettingsApiMockDecorator(Story: () => ReactElement) {
    const [isMockReady, setIsMockReady] = useState(false);

    useEffect(() => {
      const originalFetch = window.fetch;
      const storyWindow = window as Window & {
        __storybookSettingsMockState?: StorybookSettingsMockState;
        __RR_ACTIVITY_MAP_DEBUG__?: boolean;
      };
      const originalDebugFlag = storyWindow.__RR_ACTIVITY_MAP_DEBUG__;
      const originalAnonStorageValue = window.localStorage.getItem('rr:map-settings:anon');
      const originalAuthStorageValue = window.localStorage.getItem(AUTH_STORY_STORAGE_KEY);

      const appendEvent = (message: string) => {
        const timestamp = new Date().toISOString();
        const line = `${timestamp} ${message}`;
        if (storyWindow.__storybookSettingsMockState) {
          const previousEvents = storyWindow.__storybookSettingsMockState.events;
          storyWindow.__storybookSettingsMockState.events = [...previousEvents.slice(-49), line];
        }
        logger.info(line);
      };

      storyWindow.__storybookSettingsMockState = {
        isMockReady: true,
        settingsHydrated: false,
        getSettingsRequests: 0,
        putSettingsRequests: 0,
        events: [],
      };
      storyWindow[STORYBOOK_ACTIVITY_MAP_DEBUG_FLAG] = true;
      appendEvent(
        `Mock initialized. authenticated=${settingsApiMock.authenticated} saveSucceeds=${settingsApiMock.saveSucceeds}`
      );

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = getRequestUrl(input);
        const method = (
          init?.method ??
          (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET')
        ).toUpperCase();
        appendEvent(`Intercepted fetch ${method} ${url}`);

        if (url.endsWith('/api/user/settings') && method === 'GET') {
          if (storyWindow.__storybookSettingsMockState) {
            storyWindow.__storybookSettingsMockState.getSettingsRequests += 1;
          }

          if (!settingsApiMock.authenticated) {
            appendEvent('Returning 401 for /api/user/settings GET (anonymous mode)');
            return new Response(JSON.stringify({ success: false }), { status: 401 });
          }

          if (storyWindow.__storybookSettingsMockState) {
            storyWindow.__storybookSettingsMockState.settingsHydrated = true;
          }
          appendEvent('Returning 200 for /api/user/settings GET (authenticated mode)');

          return new Response(
            JSON.stringify({
              success: true,
              userId: AUTH_STORY_USER_ID,
              settings: null,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (url.endsWith('/api/user/settings') && method === 'PUT') {
          if (storyWindow.__storybookSettingsMockState) {
            storyWindow.__storybookSettingsMockState.putSettingsRequests += 1;
          }
          appendEvent(
            `Returning ${settingsApiMock.saveSucceeds ? '200' : '500'} for /api/user/settings PUT`
          );

          return new Response(JSON.stringify({ success: settingsApiMock.saveSucceeds }), {
            status: settingsApiMock.saveSucceeds ? 200 : 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return originalFetch(input, init);
      };

      window.localStorage.removeItem('rr:map-settings:anon');
      window.localStorage.removeItem(AUTH_STORY_STORAGE_KEY);
      appendEvent('Cleared map settings from localStorage for clean story state');
      setIsMockReady(true);

      return () => {
        window.fetch = originalFetch;
        storyWindow.__storybookSettingsMockState = undefined;
        storyWindow.__RR_ACTIVITY_MAP_DEBUG__ = originalDebugFlag;
        setIsMockReady(false);

        if (originalAnonStorageValue === null) {
          window.localStorage.removeItem('rr:map-settings:anon');
        } else {
          window.localStorage.setItem('rr:map-settings:anon', originalAnonStorageValue);
        }

        if (originalAuthStorageValue === null) {
          window.localStorage.removeItem(AUTH_STORY_STORAGE_KEY);
        } else {
          window.localStorage.setItem(AUTH_STORY_STORAGE_KEY, originalAuthStorageValue);
        }

        logger.info('Restored original fetch/localStorage/debug flag');
      };
    }, []);

    if (!isMockReady) {
      return (
        <div role="status" aria-live="polite" aria-label="Initializing map story mock">
          Initializing map story mock…
        </div>
      );
    }

    return <Story />;
  };
}

const meta: Meta<typeof ActivityMap> = {
  title: 'Components/ActivityMap',
  component: ActivityMap,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof meta>;

export const AnonymousUser: Story = {
  decorators: [withSettingsApiMock({ authenticated: false, saveSucceeds: true })],
};

export const AuthenticatedUserSaveSuccess: Story = {
  decorators: [withSettingsApiMock({ authenticated: true, saveSucceeds: true })],
};

export const AuthenticatedUserSaveFailureShowsTopToast: Story = {
  decorators: [withSettingsApiMock({ authenticated: true, saveSucceeds: false })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    logger.info('Save-failure play function started');
    await waitFor(() => {
      const storyWindow = window as Window & {
        __storybookSettingsMockState?: StorybookSettingsMockState;
      };
      const state = storyWindow.__storybookSettingsMockState;
      logger.info('Waiting for hydration readiness', state);
      if (!state?.isMockReady || !state.settingsHydrated || state.getSettingsRequests < 1) {
        const failureReasons = [
          !state?.isMockReady ? 'mock not ready' : null,
          state?.isMockReady && !state.settingsHydrated ? 'settings not hydrated' : null,
          (state?.getSettingsRequests ?? 0) < 1 ? 'no GET /api/user/settings observed' : null,
        ].filter(Boolean);
        throw new Error(
          `Story setup did not finish authenticated settings hydration (${failureReasons.join(', ')}). Current state: ${JSON.stringify(state)}`
        );
      }
    });
    const layersButton = await canvas.findByRole('button', { name: 'Toggle panel' });
    await userEvent.click(layersButton);
    const toggle = await canvas.findByRole('switch', { name: 'Toggle activity layer' });
    await userEvent.click(toggle);
    await waitFor(() => {
      const storyWindow = window as Window & {
        __storybookSettingsMockState?: StorybookSettingsMockState;
      };
      const state = storyWindow.__storybookSettingsMockState;
      logger.info('Waiting for save attempt', state);
      if ((state?.putSettingsRequests ?? 0) < 1) {
        throw new Error(
          `Settings save request (PUT /api/user/settings) was not triggered. Current state: ${JSON.stringify(state)}`
        );
      }
    });
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'Could not save settings to your account. Saved locally instead.'
    );
    logger.info('Save-failure toast assertion passed');
  },
};
