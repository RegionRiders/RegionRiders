import { ActivityType } from '@/lib/client/activityConfig';

export interface ActivityData {
  id: string;
  activityType: ActivityType;
  title: string;
  desc: string;
  startDate: string;
  endDate: string;
  distance: string;
  time: string;
  average: string;
}
