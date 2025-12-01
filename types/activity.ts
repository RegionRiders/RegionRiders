import { ActivityType } from '@/lib/client/activityConfig';

export interface Activity {
  id: string;
  activityType: ActivityType;
  title: string;
  desc: string;
  startDate: Date;
  endDate: string;
  distance: string;
  time: string;
  average: string;
}
