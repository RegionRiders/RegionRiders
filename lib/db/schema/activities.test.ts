import { describe, expect, it } from '@jest/globals';
import { activities, Activity, ActivityUpdate, NewActivity } from '@/lib/db';

describe('Activities Table Schema', () => {
  it('has all required columns', () => {
    expect(activities.name).toBeDefined();
    expect(activities.userId).toBeDefined();
    expect(activities.stravaActivityId).toBeDefined();
    expect(activities.type).toBeDefined();
    expect(activities.startDate).toBeDefined();
    expect(activities.createdAt).toBeDefined();
    expect(activities.updatedAt).toBeDefined();
  });

  it('infers Activity and NewActivity types', () => {
    const activity: Activity = {
      id: 'uuid',
      userId: 'uuid',
      stravaActivityId: 'strava_id',
      name: 'Ride',
      type: 'Ride',
      startDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isManual: false,
      isPrivate: false,
      metadata: null,
      description: null,
      sportType: null,
      timezone: null,
      distance: null,
      movingTime: null,
      elapsedTime: null,
      totalElevationGain: null,
      averageSpeed: null,
      elevHigh: null,
      elevLow: null,
      maxSpeed: null,
      averageCadence: null,
      averageHeartrate: null,
      maxHeartrate: null,
      calories: null,
      startLatlng: null,
      endLatlng: null,
      locationCity: null,
      locationState: null,
      locationCountry: null,
      mapPolyline: null,
      mapSummaryPolyline: null,
    };
    expect(activity).toBeDefined();
    const newActivity: NewActivity = {
      userId: 'uuid',
      name: 'Ride',
      type: 'Ride',
      startDate: new Date(),
    };
    expect(newActivity).toBeDefined();
  });

  it('infers ActivityUpdate type', () => {
    const update: ActivityUpdate = {
      name: 'Updated Ride',
      description: 'desc',
      updatedAt: new Date(),
    };
    expect(update).toBeDefined();
  });
});
