// components/ActivityTypeIcon/ActivityTypeIcon.tsx
import { ThemeIcon, Tooltip } from '@mantine/core';
import { getActivityConfig } from '@/lib/client/activityConfig';

interface ActivityTypeIconProps {
  type: string;
  size?: number;
  radius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  withHoverLabel?: boolean;
  overrideColor?: string;
}

export function ActivityTypeIcon({
  type,
  size = 20,
  radius = 'sm',
  withHoverLabel = true,
  overrideColor,
}: ActivityTypeIconProps) {
  const cfg = getActivityConfig(type);
  const IconCmp = cfg.icon;
  const color = overrideColor ?? cfg.color;

  const iconNode = (
    <ThemeIcon color={color} radius={radius}>
      <IconCmp size={size} />
    </ThemeIcon>
  );

  if (!withHoverLabel) {
    return iconNode;
  }

  return (
    <Tooltip label={cfg.label} withArrow>
      {iconNode}
    </Tooltip>
  );
}
