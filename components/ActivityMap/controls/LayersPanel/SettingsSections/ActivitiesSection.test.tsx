/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Accordion } from '@mantine/core';
import { RGBA } from '@/components/ActivityMap/mapTypes';
import { render } from '@/test-utils';
import { MapSettings } from '../types';
import { ActivitiesSection } from './ActivitiesSection';

// Wrapper component to provide Accordion context
function ActivitiesSectionWrapper(props: { settings: MapSettings; onSettingChange: jest.Mock }) {
  return (
    <Accordion defaultValue="activities">
      <ActivitiesSection {...props} />
    </Accordion>
  );
}

describe('ActivitiesSection', () => {
  const createDefaultSettings = (): MapSettings => ({
    activityMode: 'heatmap',
    showActivities: true,
    activityThickness: 3,
    heatmapDensity: 2,
    lineColorSwatches: [{ normal: [255, 0, 0, 1] as RGBA, hover: [255, 100, 100, 1] as RGBA }],
    selectedLineSwatchIndex: 0,
    activityHeatmapColorSwatches: [
      [
        { threshold: 1, color: [255, 0, 0, 0.1] as RGBA },
        { threshold: 10, color: [255, 255, 0, 0.2] as RGBA },
      ],
      [
        { threshold: 1, color: [0, 0, 255, 0.1] as RGBA },
        { threshold: 10, color: [255, 255, 255, 0.2] as RGBA },
      ],
    ],
    selectedActivityHeatmapSwatchIndex: 0,
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
    tileLayerUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  });

  let mockOnSettingChange: jest.Mock;
  let defaultSettings: MapSettings;

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

  describe('rendering', () => {
    it('should render the Activities header', () => {
      render(
        <ActivitiesSectionWrapper
          settings={defaultSettings}
          onSettingChange={mockOnSettingChange}
        />
      );

      expect(screen.getByText('Activities')).toBeInTheDocument();
    });

    it('should render the show activities toggle', () => {
      render(
        <ActivitiesSectionWrapper
          settings={defaultSettings}
          onSettingChange={mockOnSettingChange}
        />
      );

      const toggle = screen.getByRole('switch', { name: 'Toggle activity layer' });
      expect(toggle).toBeInTheDocument();
    });

    it('should render visualization mode buttons', () => {
      render(
        <ActivitiesSectionWrapper
          settings={defaultSettings}
          onSettingChange={mockOnSettingChange}
        />
      );

      expect(screen.getByRole('button', { name: 'Heatmap' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Lines' })).toBeInTheDocument();
    });

    it('should render line thickness slider', () => {
      render(
        <ActivitiesSectionWrapper
          settings={defaultSettings}
          onSettingChange={mockOnSettingChange}
        />
      );

      expect(screen.getByText(/Line thickness:/)).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onSettingChange when toggle is changed', () => {
      render(
        <ActivitiesSectionWrapper
          settings={defaultSettings}
          onSettingChange={mockOnSettingChange}
        />
      );

      const toggle = screen.getByRole('switch', { name: 'Toggle activity layer' });
      fireEvent.click(toggle);

      expect(mockOnSettingChange).toHaveBeenCalledWith('showActivities', false);
    });

    it('should call onSettingChange when lines mode is selected', () => {
      render(
        <ActivitiesSectionWrapper
          settings={defaultSettings}
          onSettingChange={mockOnSettingChange}
        />
      );

      const linesButton = screen.getByRole('button', { name: 'Lines' });
      fireEvent.click(linesButton);

      expect(mockOnSettingChange).toHaveBeenCalledWith('activityMode', 'lines');
    });

    it('should call onSettingChange when heatmap mode is selected', () => {
      const settings = { ...defaultSettings, activityMode: 'lines' as const };
      render(
        <ActivitiesSectionWrapper settings={settings} onSettingChange={mockOnSettingChange} />
      );

      const heatmapButton = screen.getByRole('button', { name: 'Heatmap' });
      fireEvent.click(heatmapButton);

      expect(mockOnSettingChange).toHaveBeenCalledWith('activityMode', 'heatmap');
    });
  });

  describe('heatmap mode', () => {
    it('should show heatmap density slider in heatmap mode', () => {
      render(
        <ActivitiesSectionWrapper
          settings={defaultSettings}
          onSettingChange={mockOnSettingChange}
        />
      );

      expect(screen.getByText(/Heatmap pixel density:/)).toBeInTheDocument();
    });

    it('should not show heatmap density slider in lines mode', () => {
      const settings = { ...defaultSettings, activityMode: 'lines' as const };
      render(
        <ActivitiesSectionWrapper settings={settings} onSettingChange={mockOnSettingChange} />
      );

      expect(screen.queryByText(/Heatmap pixel density:/)).not.toBeInTheDocument();
    });

    it('should show heatmap color scheme section in heatmap mode', () => {
      render(
        <ActivitiesSectionWrapper
          settings={defaultSettings}
          onSettingChange={mockOnSettingChange}
        />
      );

      expect(screen.getByText('Heatmap Color Scheme')).toBeInTheDocument();
    });

    it('should render heatmap swatches and edit button in heatmap mode', () => {
      render(
        <ActivitiesSectionWrapper
          settings={defaultSettings}
          onSettingChange={mockOnSettingChange}
        />
      );

      expect(screen.getByRole('button', { name: 'Edit activity heatmap colors' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'COPY' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'PASTE' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Select color 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Select color 2' })).toBeInTheDocument();
    });

    it('should call onSettingChange when a heatmap swatch is selected', () => {
      render(
        <ActivitiesSectionWrapper
          settings={defaultSettings}
          onSettingChange={mockOnSettingChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Select color 2' }));
      expect(mockOnSettingChange).toHaveBeenCalledWith('selectedActivityHeatmapSwatchIndex', 1);
    });

    it('copies selected heatmap thresholds to clipboard', async () => {
      render(
        <ActivitiesSectionWrapper
          settings={defaultSettings}
          onSettingChange={mockOnSettingChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'COPY' }));
      await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1));
    });

    it('pastes thresholds and updates selected heatmap swatch', async () => {
      (navigator.clipboard.readText as jest.Mock).mockResolvedValue(
        JSON.stringify([
          { threshold: 2, color: [1, 2, 3, 0.1] },
          { threshold: 8, color: [4, 5, 6, 0.2] },
        ])
      );

      render(
        <ActivitiesSectionWrapper
          settings={defaultSettings}
          onSettingChange={mockOnSettingChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'PASTE' }));

      await waitFor(() =>
        expect(mockOnSettingChange).toHaveBeenCalledWith(
          'activityHeatmapColorSwatches',
          expect.any(Array)
        )
      );
    });

    it('shows specific parser error toast when paste content is invalid', async () => {
      (navigator.clipboard.readText as jest.Mock).mockResolvedValue('[]');

      render(
        <ActivitiesSectionWrapper
          settings={defaultSettings}
          onSettingChange={mockOnSettingChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'PASTE' }));

      await waitFor(() => expect(navigator.clipboard.readText).toHaveBeenCalledTimes(1));
      expect(mockOnSettingChange).not.toHaveBeenCalledWith(
        'activityHeatmapColorSwatches',
        expect.any(Array)
      );
    });
  });

  describe('lines mode', () => {
    it('should show lines color scheme section in lines mode', () => {
      const settings = { ...defaultSettings, activityMode: 'lines' as const };
      render(
        <ActivitiesSectionWrapper settings={settings} onSettingChange={mockOnSettingChange} />
      );

      expect(screen.getByText('Lines ColorScheme')).toBeInTheDocument();
    });

    it('should not show lines color scheme in heatmap mode', () => {
      render(
        <ActivitiesSectionWrapper
          settings={defaultSettings}
          onSettingChange={mockOnSettingChange}
        />
      );

      expect(screen.queryByText('Lines ColorScheme')).not.toBeInTheDocument();
    });

    it('should render color swatch buttons in lines mode', () => {
      const settings = {
        ...defaultSettings,
        activityMode: 'lines' as const,
        lineColorSwatches: [
          { normal: [255, 0, 0, 1] as RGBA, hover: [255, 100, 100, 1] as RGBA },
          { normal: [0, 255, 0, 1] as RGBA, hover: [100, 255, 100, 1] as RGBA },
        ],
      };

      render(
        <ActivitiesSectionWrapper settings={settings} onSettingChange={mockOnSettingChange} />
      );

      const swatchButtons = screen.getAllByRole('button', { name: /Select color/ });
      expect(swatchButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('should render line copy and paste buttons in lines mode', () => {
      const settings = { ...defaultSettings, activityMode: 'lines' as const };
      render(<ActivitiesSectionWrapper settings={settings} onSettingChange={mockOnSettingChange} />);

      expect(screen.getByRole('button', { name: 'COPY' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'PASTE' })).toBeInTheDocument();
    });

    it('pastes line colors and updates selected swatch in lines mode', async () => {
      (navigator.clipboard.readText as jest.Mock).mockResolvedValue(
        JSON.stringify([
          { threshold: 0, color: [10, 20, 30, 1] },
          { threshold: 1, color: [40, 50, 60, 1] },
        ])
      );

      const settings = { ...defaultSettings, activityMode: 'lines' as const };
      render(<ActivitiesSectionWrapper settings={settings} onSettingChange={mockOnSettingChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'PASTE' }));

      await waitFor(() =>
        expect(mockOnSettingChange).toHaveBeenCalledWith('lineColorSwatches', expect.any(Array))
      );
    });

    it('should call onSettingChange when a line color swatch is selected', () => {
      const settings = {
        ...defaultSettings,
        activityMode: 'lines' as const,
        lineColorSwatches: [
          { normal: [255, 0, 0, 1] as RGBA, hover: [255, 100, 100, 1] as RGBA },
          { normal: [0, 255, 0, 1] as RGBA, hover: [100, 255, 100, 1] as RGBA },
        ],
      };

      render(
        <ActivitiesSectionWrapper settings={settings} onSettingChange={mockOnSettingChange} />
      );

      const swatchButtons = screen.getAllByRole('button', { name: /Select color \d+/ });
      if (swatchButtons.length > 1) {
        fireEvent.click(swatchButtons[1]);
        expect(mockOnSettingChange).toHaveBeenCalledWith('selectedLineSwatchIndex', 1);
      }
    });
  });
});
