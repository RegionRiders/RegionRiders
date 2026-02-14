import { describe, expect, it } from '@jest/globals';
import {
  ActivityDetail,
  activityFields,
  ActivityListItem,
  ActivityMapData,
  activityQueries,
  ActivityStatsData,
  ActivitySummary,
} from '@/lib/db';

describe('Activity Fields Helper', () => {
  it('core fields are defined', () => {
    expect(activityFields.core.id).toBeDefined();
    expect(activityFields.core.userId).toBeDefined();
    expect(activityFields.core.stravaActivityId).toBeDefined();
    expect(activityFields.core.name).toBeDefined();
    expect(activityFields.core.type).toBeDefined();
    expect(activityFields.core.startDate).toBeDefined();
    expect(activityFields.core.createdAt).toBeDefined();
  });

  it('basicMetrics fields are defined', () => {
    expect(activityFields.basicMetrics.distance).toBeDefined();
    expect(activityFields.basicMetrics.movingTime).toBeDefined();
    expect(activityFields.basicMetrics.elapsedTime).toBeDefined();
    expect(activityFields.basicMetrics.totalElevationGain).toBeDefined();
    expect(activityFields.basicMetrics.averageSpeed).toBeDefined();
  });

  it('performanceMetrics fields are defined', () => {
    expect(activityFields.performanceMetrics.maxSpeed).toBeDefined();
    expect(activityFields.performanceMetrics.averageCadence).toBeDefined();
    expect(activityFields.performanceMetrics.averageHeartrate).toBeDefined();
    expect(activityFields.performanceMetrics.maxHeartrate).toBeDefined();
    expect(activityFields.performanceMetrics.calories).toBeDefined();
  });

  it('location fields are defined', () => {
    expect(activityFields.location.startLatlng).toBeDefined();
    expect(activityFields.location.endLatlng).toBeDefined();
    expect(activityFields.location.locationCity).toBeDefined();
    expect(activityFields.location.locationState).toBeDefined();
    expect(activityFields.location.locationCountry).toBeDefined();
  });

  it('extended fields are defined', () => {
    expect(activityFields.extended.description).toBeDefined();
    expect(activityFields.extended.sportType).toBeDefined();
    expect(activityFields.extended.timezone).toBeDefined();
    expect(activityFields.extended.isManual).toBeDefined();
    expect(activityFields.extended.isPrivate).toBeDefined();
    expect(activityFields.extended.elevHigh).toBeDefined();
    expect(activityFields.extended.elevLow).toBeDefined();
    expect(activityFields.extended.metadata).toBeDefined();
    expect(activityFields.extended.updatedAt).toBeDefined();
  });

  it('mapData fields are defined', () => {
    expect(activityFields.mapData.mapPolyline).toBeDefined();
    expect(activityFields.mapData.mapSummaryPolyline).toBeDefined();
  });
});

describe('Activity Queries Helper', () => {
  it('list query fields are defined', () => {
    expect(activityQueries.list.id).toBeDefined();
    expect(activityQueries.list.name).toBeDefined();
    expect(activityQueries.list.distance).toBeDefined();
  });

  it('summary query fields are defined', () => {
    expect(activityQueries.summary.name).toBeDefined();
    expect(activityQueries.summary.sportType).toBeDefined();
    expect(activityQueries.summary.locationCity).toBeDefined();
  });

  it('detail query fields are defined', () => {
    expect(activityQueries.detail.maxSpeed).toBeDefined();
    expect(activityQueries.detail.metadata).toBeDefined();
    expect(activityQueries.detail.updatedAt).toBeDefined();
  });

  it('map query fields are defined', () => {
    expect(activityQueries.map.mapPolyline).toBeDefined();
    expect(activityQueries.map.mapSummaryPolyline).toBeDefined();
  });

  it('stats query fields are defined', () => {
    expect(activityQueries.stats.id).toBeDefined();
    expect(activityQueries.stats.distance).toBeDefined();
    expect(activityQueries.stats.averageSpeed).toBeDefined();
  });

  it('infers ActivityListItem, ActivitySummary, ActivityDetail, ActivityMapData, ActivityStatsData types', () => {
    const listItem: ActivityListItem = {
      id: 'uuid',
      userId: 'uuid',
      stravaActivityId: 'strava_id',
      name: 'Ride',
      type: 'Ride',
      startDate: new Date(),
      createdAt: new Date(),
      distance: 1000,
      movingTime: 3600,
      elapsedTime: 4000,
      totalElevationGain: 100,
      averageSpeed: 5.5,
    };
    expect(listItem).toBeDefined();
    const summary: ActivitySummary = {
      id: 'uuid',
      userId: 'uuid',
      stravaActivityId: 'strava_id',
      name: 'Ride',
      type: 'Ride',
      startDate: new Date(),
      createdAt: new Date(),
      distance: 1000,
      movingTime: 3600,
      elapsedTime: 4000,
      totalElevationGain: 100,
      averageSpeed: 5.5,
      description: 'desc',
      sportType: 'MTB',
      locationCity: 'City',
      locationCountry: 'Country',
    };
    expect(summary).toBeDefined();
    const detail: ActivityDetail = {
      id: 'uuid',
      userId: 'uuid',
      stravaActivityId: 'strava_id',
      name: 'Ride',
      type: 'Ride',
      startDate: new Date(),
      createdAt: new Date(),
      distance: 1000,
      movingTime: 3600,
      elapsedTime: 4000,
      totalElevationGain: 100,
      averageSpeed: 5.5,
      maxSpeed: 10,
      averageCadence: 80,
      averageHeartrate: 120,
      maxHeartrate: 150,
      calories: 500,
      startLatlng: [45.5, -73.5],
      endLatlng: [45.6, -73.6],
      locationCity: 'City',
      locationState: 'State',
      locationCountry: 'Country',
      description: 'desc',
      sportType: 'MTB',
      timezone: 'America/Montreal',
      isManual: false,
      isPrivate: false,
      elevHigh: 200,
      elevLow: 100,
      metadata: {},
      updatedAt: new Date(),
    };
    expect(detail).toBeDefined();
    const mapData: ActivityMapData = {
      id: 'uuid',
      userId: 'uuid',
      stravaActivityId: 'strava_id',
      name: 'Ride',
      type: 'Ride',
      startDate: new Date(),
      createdAt: new Date(),
      startLatlng: [45.5, -73.5],
      endLatlng: [45.6, -73.6],
      locationCity: 'City',
      locationState: 'State',
      locationCountry: 'Country',
      mapPolyline: 'polyline',
      mapSummaryPolyline: 'summary_polyline',
    };
    expect(mapData).toBeDefined();
    const statsData: ActivityStatsData = {
      id: 'uuid',
      userId: 'uuid',
      type: 'Ride',
      startDate: new Date(),
      distance: 1000,
      movingTime: 3600,
      totalElevationGain: 100,
      averageSpeed: 5.5,
    };
    expect(statsData).toBeDefined();
  });
});
