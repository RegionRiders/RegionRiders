/**
 * @jest-environment jsdom
 */

import { fireEvent, screen } from '@testing-library/react';
import { Accordion } from '@mantine/core';
import { TILE_PRESETS } from '@/components/ActivityMap/config/tilePresets';
import { RGBA } from '@/components/ActivityMap/mapTypes';
import { render } from '@/test-utils';
import { MapSettings } from '../types';
import { MapStyleSection } from './MapStyleSection';

// Wrapper component to provide Accordion context
function MapStyleSectionWrapper(props: {
  settings: MapSettings;
  onSettingChange: jest.Mock;
  viewState?: { center: [number, number]; zoom: number } | null;
}) {
  return (
    <Accordion defaultValue="mapstyle">
      <MapStyleSection {...props} />
    </Accordion>
  );
}

describe('MapStyleSection', () => {
  const createDefaultSettings = (): MapSettings => ({
    activityMode: 'heatmap',
    showActivities: true,
    activityThickness: 3,
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
    it('should render the Map Style header', () => {
      render(
        <MapStyleSectionWrapper settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      expect(screen.getByText('Map Style')).toBeInTheDocument();
    });

    it('should render map style buttons for each preset', () => {
      render(
        <MapStyleSectionWrapper settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      expect(screen.getByText('Map source')).toBeInTheDocument();
      expect(screen.getByText('Map overlay')).toBeInTheDocument();
      expect(screen.getByText('Standard')).toBeInTheDocument();
      expect(screen.getByText('Cycling Routes')).toBeInTheDocument();
      expect(screen.getByText('None')).toBeInTheDocument();
    });

    it('should render all tile presets', () => {
      render(
        <MapStyleSectionWrapper settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      Object.values(TILE_PRESETS).forEach((preset) => {
        expect(screen.getByText(preset.name)).toBeInTheDocument();
      });
      expect(screen.getByLabelText('Toggle monochromatic map source')).toBeInTheDocument();
      expect(screen.getByLabelText('Toggle monochromatic map overlay')).toBeInTheDocument();
      expect(screen.getByText('Map Tint')).toBeInTheDocument();
      expect(screen.getByLabelText('Map tint color')).toBeInTheDocument();
    });

    it('should not render copy/paste controls for map tint swatches', () => {
      render(
        <MapStyleSectionWrapper settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Paste' })).not.toBeInTheDocument();
    });

    it('should render map source section before map overlay section', () => {
      render(
        <MapStyleSectionWrapper settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      const source = screen.getByText('Map source');
      const overlay = screen.getByText('Map overlay');
      expect(source.compareDocumentPosition(overlay) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('should call onSettingChange when a map style is selected', () => {
      render(
        <MapStyleSectionWrapper settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      const darkButton = screen.getByRole('button', {
        name: /switch to dark map style/i,
      });
      fireEvent.click(darkButton);

      expect(mockOnSettingChange).toHaveBeenCalledWith('tileLayerUrl', TILE_PRESETS.dark.url);
      expect(mockOnSettingChange).toHaveBeenCalledWith(
        'attribution',
        TILE_PRESETS.dark.attribution
      );
    });

    it('should call onSettingChange when a map overlay is selected', () => {
      render(
        <MapStyleSectionWrapper settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      const overlayButton = screen.getByRole('button', {
        name: /switch to cycling routes map overlay/i,
      });
      fireEvent.click(overlayButton);

      expect(mockOnSettingChange).toHaveBeenCalledWith(
        'overlayTileLayerUrl',
        TILE_PRESETS.bikeOverlay.url
      );
      expect(mockOnSettingChange).toHaveBeenCalledWith(
        'overlayAttribution',
        TILE_PRESETS.bikeOverlay.attribution
      );
    });

    it('should call onSettingChange when map source monochromatic toggle changes', () => {
      render(
        <MapStyleSectionWrapper settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      fireEvent.click(screen.getByLabelText('Toggle monochromatic map source'));
      expect(mockOnSettingChange).toHaveBeenCalledWith('mapSourceMonochrome', true);
    });

    it('should call onSettingChange when map overlay monochromatic toggle changes', () => {
      render(
        <MapStyleSectionWrapper settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      fireEvent.click(screen.getByLabelText('Toggle monochromatic map overlay'));
      expect(mockOnSettingChange).toHaveBeenCalledWith('mapOverlayMonochrome', true);
    });

    it('should call onSettingChange when map tint swatch is selected', () => {
      render(
        <MapStyleSectionWrapper settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      const tintSwatchTwo = screen.getByRole('button', { name: /select color 2/i });
      fireEvent.click(tintSwatchTwo);
      expect(mockOnSettingChange).toHaveBeenCalledWith('selectedMapTintSwatchIndex', 1);
    });

    it('should mark the current style as active', () => {
      const settings = {
        ...defaultSettings,
        tileLayerUrl: TILE_PRESETS.satellite.url,
      };

      render(<MapStyleSectionWrapper settings={settings} onSettingChange={mockOnSettingChange} />);

      const satelliteButton = screen.getByRole('button', {
        name: /switch to satellite map style/i,
      });
      expect(satelliteButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('viewState', () => {
    it('should render without viewState', () => {
      render(
        <MapStyleSectionWrapper
          settings={defaultSettings}
          onSettingChange={mockOnSettingChange}
          viewState={null}
        />
      );

      expect(screen.getByText('Map Style')).toBeInTheDocument();
    });

    it('should render with viewState', () => {
      render(
        <MapStyleSectionWrapper
          settings={defaultSettings}
          onSettingChange={mockOnSettingChange}
          viewState={{ center: [54.35, 18.65], zoom: 12 }}
        />
      );

      expect(screen.getByText('Map Style')).toBeInTheDocument();
    });
  });
});
