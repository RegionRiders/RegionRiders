/**
 * @jest-environment jsdom
 */

import { fireEvent, screen } from '@testing-library/react';
import { render } from '@/test-utils';
import { ColorSlider } from './ColorSlider';

describe('ColorSlider', () => {
  const defaultProps = {
    value: 0.5,
    onChange: jest.fn(),
    gradient: 'linear-gradient(to right, #000, #fff)',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with horizontal orientation by default', () => {
      render(<ColorSlider {...defaultProps} />);

      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('aria-orientation', 'horizontal');
    });

    it('should render with vertical orientation when specified', () => {
      render(<ColorSlider {...defaultProps} orientation="vertical" />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('should have correct aria attributes', () => {
      render(<ColorSlider {...defaultProps} aria-label="Test Slider" />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-label', 'Test Slider');
      expect(slider).toHaveAttribute('aria-valuenow', '50');
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '100');
    });

    it('should be focusable', () => {
      render(<ColorSlider {...defaultProps} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('keyboard navigation - horizontal', () => {
    it('should increase value on ArrowRight', () => {
      const onChange = jest.fn();
      render(<ColorSlider {...defaultProps} value={0.5} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowRight' });

      expect(onChange).toHaveBeenCalledWith(0.51);
    });

    it('should decrease value on ArrowLeft', () => {
      const onChange = jest.fn();
      render(<ColorSlider {...defaultProps} value={0.5} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowLeft' });

      expect(onChange).toHaveBeenCalledWith(0.49);
    });

    it('should use larger step with shift key', () => {
      const onChange = jest.fn();
      render(<ColorSlider {...defaultProps} value={0.5} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true });

      expect(onChange).toHaveBeenCalledWith(0.6);
    });

    it('should set value to 0 on Home key', () => {
      const onChange = jest.fn();
      render(<ColorSlider {...defaultProps} value={0.5} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'Home' });

      expect(onChange).toHaveBeenCalledWith(0);
    });

    it('should set value to 1 on End key', () => {
      const onChange = jest.fn();
      render(<ColorSlider {...defaultProps} value={0.5} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'End' });

      expect(onChange).toHaveBeenCalledWith(1);
    });
  });

  describe('keyboard navigation - vertical', () => {
    it('should increase value on ArrowUp', () => {
      const onChange = jest.fn();
      render(
        <ColorSlider {...defaultProps} value={0.5} onChange={onChange} orientation="vertical" />
      );

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowUp' });

      expect(onChange).toHaveBeenCalledWith(0.51);
    });

    it('should decrease value on ArrowDown', () => {
      const onChange = jest.fn();
      render(
        <ColorSlider {...defaultProps} value={0.5} onChange={onChange} orientation="vertical" />
      );

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowDown' });

      expect(onChange).toHaveBeenCalledWith(0.49);
    });
  });

  describe('value clamping', () => {
    it('should clamp value to 1 when exceeding maximum', () => {
      const onChange = jest.fn();
      render(<ColorSlider {...defaultProps} value={0.99} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true });

      expect(onChange).toHaveBeenCalledWith(1);
    });

    it('should clamp value to 0 when going below minimum', () => {
      const onChange = jest.fn();
      render(<ColorSlider {...defaultProps} value={0.01} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowLeft', shiftKey: true });

      expect(onChange).toHaveBeenCalledWith(0);
    });
  });

  describe('aria-valuenow', () => {
    it('should reflect current value as percentage', () => {
      render(<ColorSlider {...defaultProps} value={0.75} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuenow', '75');
    });

    it('should show 0 when value is 0', () => {
      render(<ColorSlider {...defaultProps} value={0} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuenow', '0');
    });

    it('should show 100 when value is 1', () => {
      render(<ColorSlider {...defaultProps} value={1} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuenow', '100');
    });
  });
});
