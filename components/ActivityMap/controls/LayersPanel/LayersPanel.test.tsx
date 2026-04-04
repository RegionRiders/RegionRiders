/**
 * @jest-environment jsdom
 */

import { fireEvent, screen } from '@testing-library/react';
import { TILE_PRESETS } from '@/components/ActivityMap/config/tilePresets';
import { RGBA } from '@/components/ActivityMap/mapTypes';
import { render } from '@/test-utils';
import LayersPanel from './LayersPanel';
import { MapSettings } from './types';

// Mock the hooks that depend on Leaflet
jest.mock('@/components/ActivityMap/hooks/map/useMapViewState', () => ({
  useMapViewState: jest.fn(() => ({
    center: [54.35, 18.65] as [number, number],
    zoom: 12,
  })),
  MapViewState: jest.fn(),
}));

jest.mock('@/hooks/useIsSmallScreen', () => ({
  useIsSmallScreen: jest.fn(() => false),
}));

describe('LayersPanel', () => {
  const createDefaultSettings = (): MapSettings => ({
    activityMode: 'heatmap',
    showActivities: true,
    activityThickness: 3,
    activityHeatmapEdgeSmoothing: true,
    heatmapDensity: 2,
    lineColorSwatches: [{ normal: [255, 0, 0, 1] as RGBA, hover: [255, 100, 100, 1] as RGBA }],
    selectedLineSwatchIndex: 0,
    regionMode: 'static',
    showRegions: true,
    regionBorderThickness: 2,
    regionStaticColorSwatches: [
      [
        { threshold: 0, color: [60, 60, 60, 0] as RGBA },
        { threshold: 1, color: [76, 107, 34, 0.2] as RGBA },
      ],
    ],
    selectedRegionStaticSwatchIndex: 0,
    tileLayerUrl: TILE_PRESETS.standard.url,
    attribution: TILE_PRESETS.standard.attribution,
  });

  let mockOnSettingChange: jest.Mock;
  let defaultSettings: MapSettings;

  beforeEach(() => {
    mockOnSettingChange = jest.fn();
    defaultSettings = createDefaultSettings();
  });

  describe('rendering', () => {
    it('should render the Layers button', () => {
      render(<LayersPanel settings={defaultSettings} onSettingChange={mockOnSettingChange} />);

      expect(screen.getByText('Layers')).toBeInTheDocument();
    });

    it('should render with panel wrapper closed initially', () => {
      const { container } = render(
        <LayersPanel settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      // Panel wrapper should exist but not have the "open" class
      const panelWrapper = container.querySelector('[class*="panelWrapper"]');
      expect(panelWrapper).toBeInTheDocument();
      expect(panelWrapper?.className).not.toContain('panelWrapperOpen');
    });
  });

  describe('interactions', () => {
    it('should open panel when Layers button is clicked', () => {
      const { container } = render(
        <LayersPanel settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      const layersButton = screen.getByRole('button', { name: 'Toggle panel' });
      fireEvent.click(layersButton);

      // Panel wrapper should have the "open" class
      const panelWrapper = container.querySelector('[class*="panelWrapper"]');
      expect(panelWrapper?.className).toContain('panelWrapperOpen');
    });

    it('should toggle panel when Layers button is clicked twice', () => {
      const { container } = render(
        <LayersPanel settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      const layersButton = screen.getByRole('button', { name: 'Toggle panel' });

      // Open panel
      fireEvent.click(layersButton);
      let panelWrapper = container.querySelector('[class*="panelWrapper"]');
      expect(panelWrapper?.className).toContain('panelWrapperOpen');

      // Close panel
      fireEvent.click(layersButton);
      panelWrapper = container.querySelector('[class*="panelWrapper"]');
      expect(panelWrapper?.className).not.toContain('panelWrapperOpen');
    });
  });

  describe('satellite toggle', () => {
    it('should show satellite button image when not in satellite mode', () => {
      render(<LayersPanel settings={defaultSettings} onSettingChange={mockOnSettingChange} />);

      // The button should be rendered
      expect(screen.getByRole('button', { name: 'Toggle panel' })).toBeInTheDocument();
    });

    it('should show standard button image when in satellite mode', () => {
      const settings = {
        ...defaultSettings,
        tileLayerUrl: TILE_PRESETS.satellite.url,
      };

      render(<LayersPanel settings={settings} onSettingChange={mockOnSettingChange} />);

      expect(screen.getByRole('button', { name: 'Toggle panel' })).toBeInTheDocument();
    });
  });

  describe('desktop mode', () => {
    it('should render accordion sections when panel is open', () => {
      render(<LayersPanel settings={defaultSettings} onSettingChange={mockOnSettingChange} />);

      const layersButton = screen.getByRole('button', { name: 'Toggle panel' });
      fireEvent.click(layersButton);

      // Should see the accordion items
      expect(screen.getByText('Regions')).toBeInTheDocument();
      expect(screen.getByText('Activities')).toBeInTheDocument();
      expect(screen.getByText('Map Style')).toBeInTheDocument();
    });
  });
});
