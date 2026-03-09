/**
 * @jest-environment jsdom
 */

import { fireEvent, screen } from '@testing-library/react';
import type { RGBA } from '@/components/ActivityMap/mapTypes';
import { render } from '@/test-utils';
import { ExtendedColorPicker } from './ExtendedColorPicker';

describe('ExtendedColorPicker', () => {
  const defaultColor: RGBA = [255, 0, 0, 1];
  const defaultProps = {
    color: defaultColor,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render color picker', () => {
      render(<ExtendedColorPicker {...defaultProps} />);

      // The ColorPicker from Mantine renders sliders for saturation and lightness
      expect(screen.getByLabelText('Saturation')).toBeInTheDocument();
      expect(screen.getByLabelText('Lightness')).toBeInTheDocument();
    });

    it('should render mode toggle with HSLA and RGBA options', () => {
      render(<ExtendedColorPicker {...defaultProps} />);

      expect(screen.getByText('HSLA')).toBeInTheDocument();
      expect(screen.getByText('RGBA')).toBeInTheDocument();
    });

    it('should default to HSLA mode', () => {
      render(<ExtendedColorPicker {...defaultProps} />);

      // In HSLA mode, we should see Saturation and Lightness sliders
      expect(screen.getByLabelText('Saturation')).toBeInTheDocument();
      expect(screen.getByLabelText('Lightness')).toBeInTheDocument();
    });

    it('should use provided defaultMode', () => {
      render(<ExtendedColorPicker {...defaultProps} defaultMode="rgba" />);

      // In RGBA mode, we should see R, G, B sliders
      expect(screen.getByLabelText('Red')).toBeInTheDocument();
      expect(screen.getByLabelText('Green')).toBeInTheDocument();
      expect(screen.getByLabelText('Blue')).toBeInTheDocument();
    });
  });

  describe('mode switching', () => {
    it('should switch to RGBA mode when clicked', () => {
      render(<ExtendedColorPicker {...defaultProps} />);

      fireEvent.click(screen.getByText('RGBA'));

      expect(screen.getByLabelText('Red')).toBeInTheDocument();
      expect(screen.getByLabelText('Green')).toBeInTheDocument();
      expect(screen.getByLabelText('Blue')).toBeInTheDocument();
    });

    it('should switch back to HSLA mode when clicked', () => {
      render(<ExtendedColorPicker {...defaultProps} defaultMode="rgba" />);

      fireEvent.click(screen.getByText('HSLA'));

      expect(screen.getByLabelText('Saturation')).toBeInTheDocument();
      expect(screen.getByLabelText('Lightness')).toBeInTheDocument();
    });

    it('should call onModeChange when mode changes in controlled mode', () => {
      const onModeChange = jest.fn();
      render(<ExtendedColorPicker {...defaultProps} mode="hsla" onModeChange={onModeChange} />);

      fireEvent.click(screen.getByText('RGBA'));

      expect(onModeChange).toHaveBeenCalledWith('rgba');
    });
  });

  describe('layout', () => {
    it('should render in vertical layout by default', () => {
      render(<ExtendedColorPicker {...defaultProps} />);

      // In vertical layout, sliders are horizontal
      const saturationSlider = screen.getByLabelText('Saturation');
      expect(saturationSlider).toHaveAttribute('aria-orientation', 'horizontal');
    });

    it('should render in horizontal layout when specified', () => {
      render(<ExtendedColorPicker {...defaultProps} layout="horizontal" />);

      // In horizontal (side) layout, sliders are vertical
      const saturationSlider = screen.getByLabelText('Saturation');
      expect(saturationSlider).toHaveAttribute('aria-orientation', 'vertical');
    });
  });

  describe('color changes', () => {
    it('should call onChange when color changes via saturation slider', () => {
      const onChange = jest.fn();
      render(<ExtendedColorPicker color={defaultColor} onChange={onChange} />);

      // Simulate changing saturation slider
      const saturationSlider = screen.getByLabelText('Saturation');
      fireEvent.keyDown(saturationSlider, { key: 'ArrowRight' });

      expect(onChange).toHaveBeenCalled();
    });

    it('should call onChange when lightness slider changes', () => {
      const onChange = jest.fn();
      render(<ExtendedColorPicker color={defaultColor} onChange={onChange} />);

      // Simulate changing lightness slider
      const lightnessSlider = screen.getByLabelText('Lightness');
      fireEvent.keyDown(lightnessSlider, { key: 'ArrowRight' });

      expect(onChange).toHaveBeenCalled();
    });

    it('should call onChange when Red slider changes', () => {
      const onChange = jest.fn();
      render(<ExtendedColorPicker color={defaultColor} onChange={onChange} defaultMode="rgba" />);

      const redSlider = screen.getByLabelText('Red');
      fireEvent.keyDown(redSlider, { key: 'ArrowLeft' });

      expect(onChange).toHaveBeenCalled();
    });

    it('should call onChange when Green slider changes', () => {
      const onChange = jest.fn();
      render(<ExtendedColorPicker color={defaultColor} onChange={onChange} defaultMode="rgba" />);

      const greenSlider = screen.getByLabelText('Green');
      fireEvent.keyDown(greenSlider, { key: 'ArrowRight' });

      expect(onChange).toHaveBeenCalled();
    });

    it('should call onChange when Blue slider changes', () => {
      const onChange = jest.fn();
      render(<ExtendedColorPicker color={defaultColor} onChange={onChange} defaultMode="rgba" />);

      const blueSlider = screen.getByLabelText('Blue');
      fireEvent.keyDown(blueSlider, { key: 'ArrowRight' });

      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('controlled mode', () => {
    it('should use controlled mode when mode prop is provided', () => {
      render(<ExtendedColorPicker {...defaultProps} mode="rgba" />);

      expect(screen.getByLabelText('Red')).toBeInTheDocument();
      expect(screen.getByLabelText('Green')).toBeInTheDocument();
      expect(screen.getByLabelText('Blue')).toBeInTheDocument();
    });

    it('should not internally change mode when controlled', () => {
      const onModeChange = jest.fn();
      const { rerender } = render(
        <ExtendedColorPicker {...defaultProps} mode="hsla" onModeChange={onModeChange} />
      );

      fireEvent.click(screen.getByText('RGBA'));

      // Mode should not change without rerender
      expect(screen.getByLabelText('Saturation')).toBeInTheDocument();

      // Simulate parent updating mode
      rerender(<ExtendedColorPicker {...defaultProps} mode="rgba" onModeChange={onModeChange} />);

      expect(screen.getByLabelText('Red')).toBeInTheDocument();
    });
  });

  describe('SliderCol component', () => {
    it('should display letter and value labels in vertical layout', () => {
      render(<ExtendedColorPicker {...defaultProps} />);

      // Look for S: and L: labels for Saturation and Lightness
      expect(screen.getByText(/S:/)).toBeInTheDocument();
      expect(screen.getByText(/L:/)).toBeInTheDocument();
    });

    it('should display letter labels in horizontal layout', () => {
      render(<ExtendedColorPicker {...defaultProps} layout="horizontal" />);

      expect(screen.getByText('S')).toBeInTheDocument();
      expect(screen.getByText('L')).toBeInTheDocument();
    });

    it('should display RGB labels in RGBA mode', () => {
      render(<ExtendedColorPicker {...defaultProps} defaultMode="rgba" />);

      expect(screen.getByText(/R:/)).toBeInTheDocument();
      expect(screen.getByText(/G:/)).toBeInTheDocument();
      expect(screen.getByText(/B:/)).toBeInTheDocument();
    });
  });

  describe('text input interaction', () => {
    it('should render text input in HSLA mode', () => {
      render(<ExtendedColorPicker {...defaultProps} />);

      // There should be a text input for HSLA values
      const textInputs = screen.getAllByRole('textbox');
      expect(textInputs.length).toBeGreaterThan(0);
    });

    it('should render text input in RGBA mode', () => {
      render(<ExtendedColorPicker {...defaultProps} defaultMode="rgba" />);

      // There should be a text input for RGBA values
      const textInputs = screen.getAllByRole('textbox');
      expect(textInputs.length).toBeGreaterThan(0);
    });
  });
});
