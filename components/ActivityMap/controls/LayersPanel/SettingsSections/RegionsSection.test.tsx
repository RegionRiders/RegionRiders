/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Accordion } from '@mantine/core';
import { RGBA } from '@/components/ActivityMap/mapTypes';
import { render } from '@/test-utils';
import { MapSettings } from '../types';
import { RegionsSection } from './RegionsSection';

// Wrapper component to provide Accordion context
function RegionsSectionWrapper(props: { settings: MapSettings; onSettingChange: jest.Mock }) {
  return (
    <Accordion defaultValue="regions">
      <RegionsSection {...props} />
    </Accordion>
  );
}

describe('RegionsSection', () => {
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
    regionLayerTransparency: 1,
    regionStaticColorSwatches: [
      [
        { threshold: 0, color: [60, 60, 60, 0] as RGBA },
        { threshold: 1, color: [76, 107, 34, 0.2] as RGBA },
      ],
    ],
    selectedRegionStaticSwatchIndex: 0,
    regionHeatmapColorSwatches: [
      [
        { threshold: 0, color: [60, 60, 60, 0] as RGBA },
        { threshold: 5, color: [255, 165, 0, 0.1] as RGBA },
      ],
      [
        { threshold: 0, color: [50, 50, 50, 0] as RGBA },
        { threshold: 5, color: [0, 255, 255, 0.1] as RGBA },
      ],
    ],
    selectedRegionHeatmapSwatchIndex: 0,
    tileLayerUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  });

  let mockOnSettingChange: jest.Mock;
  let defaultSettings: MapSettings;
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    mockOnSettingChange = jest.fn();
    defaultSettings = createDefaultSettings();
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
        readText: jest.fn().mockResolvedValue(''),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalClipboard === undefined) {
      delete (navigator as { clipboard?: Clipboard }).clipboard;
      return;
    }

    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
  });

  describe('rendering', () => {
    it('should render the Regions header', () => {
      render(
        <RegionsSectionWrapper settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      expect(screen.getByText('Regions')).toBeInTheDocument();
    });

    it('should render the show regions toggle', () => {
      render(
        <RegionsSectionWrapper settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      const toggle = screen.getByRole('switch', { name: 'Toggle region borders' });
      expect(toggle).toBeInTheDocument();
    });

    it('should render visualization mode buttons', () => {
      render(
        <RegionsSectionWrapper settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      expect(screen.getByText('Heatmap')).toBeInTheDocument();
      expect(screen.getByText('Static')).toBeInTheDocument();
    });

    it('should render border thickness slider', () => {
      render(
        <RegionsSectionWrapper settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      expect(screen.getByText(/Border thickness:/)).toBeInTheDocument();
    });

    it('should render layer transparency slider', () => {
      render(
        <RegionsSectionWrapper settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      expect(screen.getByText(/Layer transparency:/)).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onSettingChange when toggle is changed', () => {
      render(
        <RegionsSectionWrapper settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      const toggle = screen.getByRole('switch', { name: 'Toggle region borders' });
      fireEvent.click(toggle);

      expect(mockOnSettingChange).toHaveBeenCalledWith('showRegions', false);
    });

    it('should call onSettingChange when heatmap mode is selected', () => {
      render(
        <RegionsSectionWrapper settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      const heatmapButton = screen.getByRole('button', { name: 'Heatmap' });
      fireEvent.click(heatmapButton);

      expect(mockOnSettingChange).toHaveBeenCalledWith('regionMode', 'heatmap');
    });

    it('should call onSettingChange when static mode is selected', () => {
      const settings = { ...defaultSettings, regionMode: 'heatmap' as const };
      render(<RegionsSectionWrapper settings={settings} onSettingChange={mockOnSettingChange} />);

      const staticButton = screen.getByRole('button', { name: 'Static' });
      fireEvent.click(staticButton);

      expect(mockOnSettingChange).toHaveBeenCalledWith('regionMode', 'static');
    });
  });

  describe('static mode', () => {
    it('should show color scheme section in static mode', () => {
      render(
        <RegionsSectionWrapper settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      expect(screen.getByText('Region ColorScheme')).toBeInTheDocument();
    });

    it('should not show color scheme section in heatmap mode', () => {
      const settings = { ...defaultSettings, regionMode: 'heatmap' as const };
      render(<RegionsSectionWrapper settings={settings} onSettingChange={mockOnSettingChange} />);

      expect(screen.queryByText('Region ColorScheme')).not.toBeInTheDocument();
    });

    it('should render color swatch buttons for each color scheme', () => {
      const settings = {
        ...defaultSettings,
        regionStaticColorSwatches: [
          [
            { threshold: 0, color: [60, 60, 60, 0] as RGBA },
            { threshold: 1, color: [76, 107, 34, 0.2] as RGBA },
          ],
          [
            { threshold: 0, color: [100, 100, 100, 0] as RGBA },
            { threshold: 1, color: [0, 255, 0, 0.3] as RGBA },
          ],
        ],
      };

      render(<RegionsSectionWrapper settings={settings} onSettingChange={mockOnSettingChange} />);

      // Should have 2 color swatch buttons for selection
      const swatchButtons = screen.getAllByRole('button', { name: /Select color/ });
      expect(swatchButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('should render clipboard buttons (without rgba text inputs) in static mode', () => {
      render(
        <RegionsSectionWrapper settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Paste' })).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('rgba(255, 0, 0, 0.5)')).not.toBeInTheDocument();
    });

    it('pastes static region colors into unvisited and visited', async () => {
      (navigator.clipboard.readText as jest.Mock).mockResolvedValue(
        JSON.stringify([
          { threshold: 0, color: [10, 20, 30, 0.1] },
          { threshold: 1, color: [40, 50, 60, 0.3] },
        ])
      );
      render(
        <RegionsSectionWrapper settings={defaultSettings} onSettingChange={mockOnSettingChange} />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Paste' }));

      await waitFor(() =>
        expect(mockOnSettingChange).toHaveBeenCalledWith('regionStaticColorSwatches', [
          [
            { threshold: 0, color: [10, 20, 30, 0.1] },
            { threshold: 1, color: [40, 50, 60, 0.3] },
          ],
        ])
      );
    });

    it('should call onSettingChange when a color swatch is selected', () => {
      const settings = {
        ...defaultSettings,
        regionStaticColorSwatches: [
          [
            { threshold: 0, color: [60, 60, 60, 0] as RGBA },
            { threshold: 1, color: [76, 107, 34, 0.2] as RGBA },
          ],
          [
            { threshold: 0, color: [100, 100, 100, 0] as RGBA },
            { threshold: 1, color: [0, 255, 0, 0.3] as RGBA },
          ],
        ],
      };

      render(<RegionsSectionWrapper settings={settings} onSettingChange={mockOnSettingChange} />);

      // Find and click the second swatch button
      const swatchButtons = screen.getAllByRole('button', { name: /Select color \d+/ });
      expect(swatchButtons).toHaveLength(2);
      fireEvent.click(swatchButtons[1]);
      expect(mockOnSettingChange).toHaveBeenCalledWith('selectedRegionStaticSwatchIndex', 1);
    });
  });

  describe('empty state', () => {
    it('should handle empty color swatches gracefully', () => {
      const settings = {
        ...defaultSettings,
        regionStaticColorSwatches: [],
      };

      expect(() => {
        render(<RegionsSectionWrapper settings={settings} onSettingChange={mockOnSettingChange} />);
      }).not.toThrow();
    });
  });

  describe('heatmap mode', () => {
    it('should render heatmap swatches and edit button in heatmap mode', () => {
      const settings = { ...defaultSettings, regionMode: 'heatmap' as const };
      render(<RegionsSectionWrapper settings={settings} onSettingChange={mockOnSettingChange} />);

      expect(screen.getByText('Heatmap Color Scheme')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Edit region heatmap colors' })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Paste' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Select color 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Select color 2' })).toBeInTheDocument();
    });

    it('should call onSettingChange when a heatmap swatch is selected', () => {
      const settings = { ...defaultSettings, regionMode: 'heatmap' as const };
      render(<RegionsSectionWrapper settings={settings} onSettingChange={mockOnSettingChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Select color 2' }));
      expect(mockOnSettingChange).toHaveBeenCalledWith('selectedRegionHeatmapSwatchIndex', 1);
    });

    it('copies selected region heatmap thresholds to clipboard', async () => {
      const settings = { ...defaultSettings, regionMode: 'heatmap' as const };
      render(<RegionsSectionWrapper settings={settings} onSettingChange={mockOnSettingChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
      await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1));
    });

    it('pastes thresholds and updates selected region heatmap swatch', async () => {
      (navigator.clipboard.readText as jest.Mock).mockResolvedValue(
        JSON.stringify([
          { threshold: 2, color: [1, 2, 3, 0.1] },
          { threshold: 8, color: [4, 5, 6, 0.2] },
        ])
      );

      const settings = { ...defaultSettings, regionMode: 'heatmap' as const };
      render(<RegionsSectionWrapper settings={settings} onSettingChange={mockOnSettingChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Paste' }));

      await waitFor(() =>
        expect(mockOnSettingChange).toHaveBeenCalledWith(
          'regionHeatmapColorSwatches',
          expect.any(Array)
        )
      );
    });

    it('shows specific parser error toast when region paste content is invalid', async () => {
      (navigator.clipboard.readText as jest.Mock).mockResolvedValue('[]');

      const settings = { ...defaultSettings, regionMode: 'heatmap' as const };
      render(<RegionsSectionWrapper settings={settings} onSettingChange={mockOnSettingChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Paste' }));

      await waitFor(() => expect(navigator.clipboard.readText).toHaveBeenCalledTimes(1));
      expect(mockOnSettingChange).not.toHaveBeenCalledWith(
        'regionHeatmapColorSwatches',
        expect.any(Array)
      );
    });
  });
});
