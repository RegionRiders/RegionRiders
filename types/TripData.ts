import { ActivityData } from '@/types/ActivityData';

export interface TripData {
  id: string;
  title: string;
  distance: string;
  startDate: string;
  endDate: string;
  activities: ActivityData[];
}
