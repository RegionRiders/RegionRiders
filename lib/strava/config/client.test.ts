/**
 * @jest-environment node
 */

import strava from 'strava-v3';
import { validateStravaEnv } from '@/lib/strava';
import { createStravaClient, getStravaClient } from './client';

jest.mock('./validateEnv');
jest.mock('strava-v3');

describe('createStravaClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new client instance with provided config', () => {
    const mockConfig = {
      client_id: 'test_id',
      client_secret: 'test_secret',
      access_token: 'test_token',
      redirect_uri: 'http://test.com',
    };

    const mockClient = { config: jest.fn() };
    jest.spyOn(Object, 'create').mockReturnValue(mockClient);

    const client = createStravaClient(mockConfig);

    expect(Object.create).toHaveBeenCalledWith(strava);
    expect(mockClient.config).toHaveBeenCalledWith(mockConfig);
    expect(client).toBe(mockClient);
  });

  it('should create isolated instances that do not share state', () => {
    const config1 = {
      client_id: 'id_1',
      client_secret: 'secret_1',
      access_token: 'token_1',
      redirect_uri: 'http://test1.com',
    };

    const config2 = {
      client_id: 'id_2',
      client_secret: 'secret_2',
      access_token: 'token_2',
      redirect_uri: 'http://test2.com',
    };

    const mockClient1 = { config: jest.fn() };
    const mockClient2 = { config: jest.fn() };

    jest.spyOn(Object, 'create').mockReturnValueOnce(mockClient1).mockReturnValueOnce(mockClient2);

    const client1 = createStravaClient(config1);
    const client2 = createStravaClient(config2);

    expect(client1).not.toBe(client2);
    expect(mockClient1.config).toHaveBeenCalledWith(config1);
    expect(mockClient2.config).toHaveBeenCalledWith(config2);
  });
});

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
    const mockClient = { config: jest.fn() };
    jest.spyOn(Object, 'create').mockReturnValue(mockClient);

    getStravaClient();

    expect(validateStravaEnv).toHaveBeenCalledTimes(1);
  });

  it('should return a new strava instance, not the global singleton', () => {
    (validateStravaEnv as jest.Mock).mockImplementation(() => {});
    const mockClient = { config: jest.fn() };
    jest.spyOn(Object, 'create').mockReturnValue(mockClient);

    const client = getStravaClient();

    expect(client).toBe(mockClient);
    expect(client).not.toBe(strava);
  });

  it('should configure client with environment variables', () => {
    (validateStravaEnv as jest.Mock).mockImplementation(() => {});
    const mockClient = { config: jest.fn() };
    jest.spyOn(Object, 'create').mockReturnValue(mockClient);

    getStravaClient();

    expect(mockClient.config).toHaveBeenCalledWith({
      client_id: 'test_id',
      client_secret: 'test_secret',
      access_token: 'test_token',
      redirect_uri: 'http://test.com',
    });
  });

  it('should throw on validation failure', () => {
    const error = new Error('Missing vars');
    (validateStravaEnv as jest.Mock).mockImplementation(() => {
      throw error;
    });

    expect(() => getStravaClient()).toThrow('Missing vars');
  });

  it('should create isolated instances on concurrent calls', () => {
    (validateStravaEnv as jest.Mock).mockImplementation(() => {});
    const mockClient1 = { config: jest.fn() };
    const mockClient2 = { config: jest.fn() };

    jest.spyOn(Object, 'create').mockReturnValueOnce(mockClient1).mockReturnValueOnce(mockClient2);

    const client1 = getStravaClient();
    const client2 = getStravaClient();

    expect(client1).not.toBe(client2);
    expect(client1).not.toBe(strava);
    expect(client2).not.toBe(strava);
  });
});
