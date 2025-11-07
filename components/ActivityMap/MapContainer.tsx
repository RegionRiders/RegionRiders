'use client';

import { drawSubdivisions } from './drawSubdivisions/drawSubdivisions';
import { drawActivities } from './drawActivities/drawActivities';

import { useEffect, useRef, useState } from 'react';
import {GPXTrack, Subdivision} from "@/lib/types/types";
import {DataLoader} from "@/lib/services/dataLoader";

interface MapContainerProps {
  map: any;
  tracks: Map<string, GPXTrack>;
  onFeatureClick?: (feature: any) => void;
}

export default function MapContainer({
                               map,
                               tracks,
                               onFeatureClick,
                             }: MapContainerProps) {
  const [subdivisions, setSubdivisions] = useState<Subdivision[]>([]);
  const currentImageLayerRef = useRef<any>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const renderAbortRef = useRef(false);

  useEffect(() => {
    const loadSubdivisions = async () => {
      try {
        const subs = await DataLoader.loadSubdivisions() as Subdivision[];
        setSubdivisions(subs);
      } catch (error) {
        console.error('Failed to load subdivisions:', error);
      }
    };
    loadSubdivisions();
  }, []);

  useEffect(() => {
    if (!map || subdivisions.length === 0) return;
    drawSubdivisions(map, subdivisions, onFeatureClick);
  }, [map, subdivisions, onFeatureClick]);

  useEffect(() => {
    if (!map || tracks.size === 0) return;
    const cleanup = drawActivities(map, tracks, currentImageLayerRef, renderAbortRef, renderTimeoutRef);
    return cleanup;
  }, [map, tracks]);

  return null;
}
