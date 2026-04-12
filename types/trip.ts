import { Activity } from '@/types/activity';

export interface Trip {
  id: string;
  title: string;
  distance: string;
  startDate: Date;
  endDate: Date;
  activities: Activity[];
}
