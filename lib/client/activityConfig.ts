import {
  Icon,
  IconActivity,
  IconBallFootball,
  IconBallTennis,
  IconBallVolleyball,
  IconBarbell,
  IconBike,
  IconGolf,
  IconHeartRateMonitor,
  IconHelp,
  IconIceCream2,
  IconKayak,
  IconMountain,
  IconMountainOff,
  IconRollerSkating,
  IconRun,
  IconSailboat,
  IconShoe,
  IconSkateboard,
  IconSnowboarding,
  IconSnowflake,
  IconStretching,
  IconSwimming,
  IconWalk,
  IconWaveSine,
  IconWheelchair,
  IconWindmill,
  IconYoga,
} from '@tabler/icons-react';

export interface ActivityTypeConfig {
  icon: Icon;
  label: string;
  color?: string;
}

export const ACTIVITY_TYPES: Record<string, ActivityTypeConfig> = {
  // Foot Sports
  run: {
    icon: IconRun,
    label: 'Run',
  },
  trail_run: {
    icon: IconMountain,
    label: 'Trail Run',
  },
  walk: {
    icon: IconWalk,
    label: 'Walk',
  },
  hike: {
    icon: IconShoe,
    label: 'Hike',
  },
  virtual_run: {
    icon: IconRun,
    label: 'Virtual Run',
  },

  // Cycle Sports
  ride: {
    icon: IconBike,
    label: 'Ride',
  },
  mountain_bike_ride: {
    icon: IconMountain,
    label: 'Mountain Bike Ride',
  },
  gravel_ride: {
    icon: IconBike,
    label: 'Gravel Ride',
  },
  e_bike_ride: {
    icon: IconBike,
    label: 'E-Bike Ride',
  },
  e_mountain_bike_ride: {
    icon: IconMountain,
    label: 'E-Mountain Bike Ride',
  },
  velomobile: {
    icon: IconBike,
    label: 'Velomobile',
  },
  virtual_ride: {
    icon: IconBike,
    label: 'Virtual Ride',
  },

  // Water Sports
  canoe: {
    icon: IconKayak,
    label: 'Canoe',
  },
  kayak: {
    icon: IconKayak,
    label: 'Kayak',
  },
  kitesurf: {
    icon: IconWindmill,
    label: 'Kitesurf',
  },
  rowing: {
    icon: IconSailboat,
    label: 'Rowing',
  },
  stand_up_paddling: {
    icon: IconSailboat,
    label: 'Stand Up Paddling',
  },
  surf: {
    icon: IconWaveSine,
    label: 'Surf',
  },
  swim: {
    icon: IconSwimming,
    label: 'Swim',
  },
  windsurf: {
    icon: IconWindmill,
    label: 'Windsurf',
  },
  sail: {
    icon: IconWindmill,
    label: 'Sail',
  },

  // Winter Sports
  ice_skate: {
    icon: IconIceCream2,
    label: 'Ice Skate',
  },
  alpine_ski: {
    icon: IconMountain,
    label: 'Alpine Ski',
  },
  backcountry_ski: {
    icon: IconMountain,
    label: 'Backcountry Ski',
  },
  nordic_ski: {
    icon: IconMountain,
    label: 'Nordic Ski',
  },
  snowboard: {
    icon: IconSnowboarding,
    label: 'Snowboard',
  },
  snowshoe: {
    icon: IconSnowflake,
    label: 'Snowshoe',
  },

  // Other Sports
  handcycle: {
    icon: IconBike,
    label: 'Handcycle',
  },
  inline_skate: {
    icon: IconRollerSkating,
    label: 'Inline Skate',
  },
  rock_climb: {
    icon: IconMountainOff,
    label: 'Rock Climb',
  },
  roller_ski: {
    icon: IconRollerSkating,
    label: 'Roller Ski',
  },
  golf: {
    icon: IconGolf,
    label: 'Golf',
  },
  skateboard: {
    icon: IconSkateboard,
    label: 'Skateboard',
  },
  football: {
    icon: IconBallFootball,
    label: 'Football (Soccer)',
  },
  wheelchair: {
    icon: IconWheelchair,
    label: 'Wheelchair',
  },
  badminton: {
    icon: IconBallVolleyball,
    label: 'Badminton',
  },
  tennis: {
    icon: IconBallTennis,
    label: 'Tennis',
  },
  pickleball: {
    icon: IconBallTennis,
    label: 'Pickleball',
  },
  crossfit: {
    icon: IconBarbell,
    label: 'Crossfit',
  },
  elliptical: {
    icon: IconActivity,
    label: 'Elliptical',
  },
  stair_stepper: {
    icon: IconActivity,
    label: 'Stair Stepper',
  },
  weight_training: {
    icon: IconBarbell,
    label: 'Weight Training',
  },
  yoga: {
    icon: IconYoga,
    label: 'Yoga',
  },
  workout: {
    icon: IconHeartRateMonitor,
    label: 'Workout',
  },
  hiit: {
    icon: IconHeartRateMonitor,
    label: 'HIIT',
  },
  pilates: {
    icon: IconStretching,
    label: 'Pilates',
  },
  table_tennis: {
    icon: IconBallTennis,
    label: 'Table Tennis',
  },
  squash: {
    icon: IconBallTennis,
    label: 'Squash',
  },
  racquetball: {
    icon: IconBallTennis,
    label: 'Racquetball',
  },
  virtual_rowing: {
    icon: IconSailboat,
    label: 'Virtual Rowing',
  },
} as const;

export type ActivityType = keyof typeof ACTIVITY_TYPES;

// Fallback for unknown activity types
export const DEFAULT_ACTIVITY: ActivityTypeConfig = {
  icon: IconHelp,
  label: 'Unknown Activity Type',
  color: 'gray',
};

// Helper function to get activity config
export const getActivityConfig = (activityType: string): ActivityTypeConfig => {
  return ACTIVITY_TYPES[activityType.toLowerCase()] || DEFAULT_ACTIVITY;
};
