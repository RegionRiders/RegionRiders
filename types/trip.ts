import { Activity } from '@/types/activity';

export interface Trip {
  id: string;
  title: string;
  distance: string;
  startDate: string;
  endDate: string;
  activities: Activity[];
}
