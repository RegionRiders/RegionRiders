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

/**
 * Render an activity icon with a themed background and an optional hover tooltip.
 *
 * Looks up the activity configuration for the given `type` to determine the icon, label, and default color.
 *
 * @param type - Activity type key used to select the configured icon, label, and color
 * @param size - Icon size in pixels (default: 20)
 * @param radius - Corner radius passed to the ThemeIcon (default: 'sm')
 * @param withHoverLabel - If true, wrap the icon in a Tooltip that shows the activity label on hover (default: true)
 * @param overrideColor - Optional color to use for the ThemeIcon background instead of the configured color
 * @returns A JSX element containing the themed activity icon; wrapped in a tooltip when `withHoverLabel` is true
 */
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
