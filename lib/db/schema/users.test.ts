import { describe, expect, it } from '@jest/globals';
import { NewUser, User, users, UserUpdate } from './users';

describe('Users Table Schema', () => {
  it('has all required columns', () => {
    expect(users.id).toBeDefined();
    expect(users.stravaId).toBeDefined();
    expect(users.email).toBeDefined();
    expect(users.firstName).toBeDefined();
    expect(users.lastName).toBeDefined();
    expect(users.isActive).toBeDefined();
    expect(users.createdAt).toBeDefined();
    expect(users.updatedAt).toBeDefined();
  });

  it('infers User and NewUser types', () => {
    const user: User = {
      id: 'uuid',
      stravaId: 'strava_id',
      email: null,
      firstName: null,
      lastName: null,
      profilePicture: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isActive: true,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(user).toBeDefined();
    const newUser: NewUser = {
      stravaId: 'strava_id',
      email: 'user@example.com',
      firstName: 'First',
      lastName: 'Last',
    };
    expect(newUser).toBeDefined();
  });

  it('infers UserUpdate type', () => {
    const update: UserUpdate = {
      firstName: 'Updated',
      lastName: 'Name',
      isActive: false,
    };
    expect(update).toBeDefined();
  });
});
