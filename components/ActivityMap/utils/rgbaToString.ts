import { RGBA } from '@/components/ActivityMap/mapTypes';

export function rgbaToString([r, g, b, a]: RGBA): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
