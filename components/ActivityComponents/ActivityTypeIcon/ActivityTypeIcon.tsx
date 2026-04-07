'use client';

import type { FC } from 'react';
import {
  IconBike,
  IconFish,
  IconFlame,
  IconMountain,
  IconQuestionMark,
  IconRun,
  IconSkiJumping,
  IconSnowflake,
  IconSoccerField,
  IconSwimming,
  IconWalk,
} from '@tabler/icons-react';
import { ThemeIcon, Tooltip } from '@mantine/core';
import { getActivityConfig } from '@/lib/client/activityConfig';

const ICON_COMPONENTS: Record<string, FC<{ size?: number; color?: string }>> = {
  IconRun,
  IconBike,
  IconSwimming,
  IconWalk,
  IconMountain,
  IconSnowflake,
  IconSkiJumping,
  IconFish,
  IconFlame,
  IconSoccerField,
  IconQuestionMark,
};

interface ActivityTypeIconProps {
  type: string;
  size?: number;
  overrideColor?: string;
  radius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  withHoverLabel?: boolean;
}

export function ActivityTypeIcon({
  type,
  size = 24,
  overrideColor,
  radius = 'md',
  withHoverLabel = true,
}: ActivityTypeIconProps) {
  const config = getActivityConfig(type);
  const IconComponent = ICON_COMPONENTS[config.icon] ?? IconQuestionMark;
  const color = overrideColor ?? config.color;

  const icon = (
    <ThemeIcon color={color} radius={radius} size={size}>
      <IconComponent size={size * 0.6} />
    </ThemeIcon>
  );

  if (!withHoverLabel) {
    return icon;
  }

  return (
    <Tooltip label={config.label} keepMounted>
      {icon}
    </Tooltip>
  );
}
