export interface ActivityConfig {
  label: string;
  /** Tabler icon name key used to resolve the icon component in UI */
  icon: string;
  color: string;
}

export const DEFAULT_ACTIVITY: ActivityConfig = {
  label: 'Unknown Activity Type',
  icon: 'IconQuestionMark',
  color: 'gray',
};

export const ACTIVITY_TYPES: Record<string, ActivityConfig> = {
  run: { label: 'Run', icon: 'IconRun', color: 'orange' },
  ride: { label: 'Ride', icon: 'IconBike', color: 'blue' },
  swim: { label: 'Swim', icon: 'IconSwimming', color: 'cyan' },
  walk: { label: 'Walk', icon: 'IconWalk', color: 'green' },
  hike: { label: 'Hike', icon: 'IconMountain', color: 'teal' },
  alpine_ski: { label: 'Alpine Ski', icon: 'IconSnowflake', color: 'indigo' },
  backcountry_ski: { label: 'Backcountry Ski', icon: 'IconSnowflake', color: 'indigo' },
  canoeing: { label: 'Canoeing', icon: 'IconFish', color: 'cyan' },
  crossfit: { label: 'Crossfit', icon: 'IconFlame', color: 'red' },
  e_bike_ride: { label: 'E-Bike Ride', icon: 'IconBike', color: 'blue' },
  elliptical: { label: 'Elliptical', icon: 'IconRun', color: 'orange' },
  football: { label: 'Football (Soccer)', icon: 'IconSoccerField', color: 'green' },
  golf: { label: 'Golf', icon: 'IconWalk', color: 'green' },
  handcycle: { label: 'Handcycle', icon: 'IconBike', color: 'blue' },
  ice_skate: { label: 'Ice Skate', icon: 'IconSnowflake', color: 'cyan' },
  inline_skate: { label: 'Inline Skate', icon: 'IconRun', color: 'orange' },
  kayaking: { label: 'Kayaking', icon: 'IconFish', color: 'cyan' },
  kitesurf: { label: 'Kitesurf', icon: 'IconSwimming', color: 'cyan' },
  mountain_bike_ride: { label: 'Mountain Bike Ride', icon: 'IconBike', color: 'brown' },
  nordic_ski: { label: 'Nordic Ski', icon: 'IconSnowflake', color: 'indigo' },
  rock_climbing: { label: 'Rock Climbing', icon: 'IconMountain', color: 'teal' },
  roller_ski: { label: 'Roller Ski', icon: 'IconRun', color: 'orange' },
  rowing: { label: 'Rowing', icon: 'IconFish', color: 'cyan' },
  snowboard: { label: 'Snowboard', icon: 'IconSkiJumping', color: 'indigo' },
  snowshoe: { label: 'Snowshoe', icon: 'IconSnowflake', color: 'indigo' },
  soccer: { label: 'Soccer', icon: 'IconSoccerField', color: 'green' },
  stair_stepper: { label: 'Stair Stepper', icon: 'IconRun', color: 'orange' },
  stand_up_paddling: { label: 'Stand Up Paddling', icon: 'IconSwimming', color: 'cyan' },
  surf: { label: 'Surf', icon: 'IconSwimming', color: 'cyan' },
  virtual_ride: { label: 'Virtual Ride', icon: 'IconBike', color: 'blue' },
  virtual_run: { label: 'Virtual Run', icon: 'IconRun', color: 'orange' },
  weight_training: { label: 'Weight Training', icon: 'IconFlame', color: 'red' },
  wheelchair: { label: 'Wheelchair', icon: 'IconRun', color: 'gray' },
  windsurf: { label: 'Windsurf', icon: 'IconSwimming', color: 'cyan' },
  workout: { label: 'Workout', icon: 'IconFlame', color: 'red' },
  yoga: { label: 'Yoga', icon: 'IconWalk', color: 'violet' },
};

/**
 * Get the display config for a given activity type string.
 * Case-insensitive. Returns DEFAULT_ACTIVITY for unknown types.
 */
export function getActivityConfig(type: string): ActivityConfig {
  if (!type) return DEFAULT_ACTIVITY;
  const config = ACTIVITY_TYPES[type.toLowerCase()];
  return config ?? DEFAULT_ACTIVITY;
}
