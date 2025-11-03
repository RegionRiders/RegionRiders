/**
 * @jest-environment node
 */

import strava from 'strava-v3';
import { validateStravaEnv } from '@/lib/strava';
import { getStravaClient } from './client';

jest.mock('./validateEnv');
jest.mock('strava-v3');

describe('getStravaClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRAVA_CLIENT_ID = 'test_id';
    process.env.STRAVA_CLIENT_SECRET = 'test_secret';
    process.env.STRAVA_REDIRECT_URI = 'http://test.com';
    process.env.STRAVA_CLIENT_ACCESS_TOKEN = 'test_token';
  });

  it('should validate env before configuring', () => {
    (validateStravaEnv as jest.Mock).mockImplementation(() => {});

    getStravaClient();

    expect(validateStravaEnv).toHaveBeenCalledTimes(1);
  });

  it('should return strava instance', () => {
    (validateStravaEnv as jest.Mock).mockImplementation(() => {});

    const client = getStravaClient();

    expect(client).toBe(strava);
  });

  it('should throw on validation failure', () => {
    const error = new Error('Missing vars');
    (validateStravaEnv as jest.Mock).mockImplementation(() => {
      throw error;
    });

    expect(() => getStravaClient()).toThrow('Missing vars');
  });
});
