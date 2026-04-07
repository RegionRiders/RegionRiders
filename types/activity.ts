/**
 * Frontend Activity type representing a Strava activity for display
 */
export interface Activity {
  id: string;
  activityType: string;
  title: string;
  desc?: string;
  startDate: Date | string;
  endDate?: Date | string;
  distance?: string;
  time?: string;
  average?: string;
  imageUrl?: string;
}
