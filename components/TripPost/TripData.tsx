import {ActivityData} from "@/components/ActivityPost/ActivityData";

export interface TripData {
  title: string;
  distance: string;
  startDate: string;
  endDate: string;
  activities: ActivityData[];
}