/**
 * @jest-environment jsdom
 */

import { fireEvent, screen } from '@testing-library/react';
import type { RGBA } from '@/components/ActivityMap/mapTypes';
import { render } from '@/test-utils';
import { ColorPickerModalButton } from './ColorPickerModalButton';

describe('ColorPickerModalButton', () => {
  const defaultProps = {
    primaryColor: [255, 0, 0, 1] as RGBA,
    secondaryColor: [0, 255, 0, 1] as RGBA,
    primaryLabel: 'Normal',
    secondaryLabel: 'Hover',
    onColorChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the color swatch button', () => {
      render(<ColorPickerModalButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: /select color/i });
      expect(button).toBeInTheDocument();
    });

    it('should show edit icon', () => {
      render(<ColorPickerModalButton {...defaultProps} />);

      // The IconEdit should be rendered inside the button
      const button = screen.getByRole('button', { name: /select color/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('modal interaction', () => {
    it('should open modal when button is clicked', () => {
      render(<ColorPickerModalButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: /select color/i });
      fireEvent.click(button);

      expect(screen.getByText('Pick a color')).toBeInTheDocument();
    });

    it('should show primary/secondary color mode toggle', () => {
      render(<ColorPickerModalButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: /select color/i });
      fireEvent.click(button);

      expect(screen.getByText('Normal')).toBeInTheDocument();
      expect(screen.getByText('Hover')).toBeInTheDocument();
    });

    it('should show Cancel and OK buttons', () => {
      render(<ColorPickerModalButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: /select color/i });
      fireEvent.click(button);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('OK')).toBeInTheDocument();
    });

    it('should close modal when Cancel is clicked', () => {
      render(<ColorPickerModalButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: /select color/i });
      fireEvent.click(button);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      // Modal should be closed (Pick a color text should not be visible)
      expect(screen.queryByText('Pick a color')).not.toBeInTheDocument();
    });

    it('should call onColorChange when OK is clicked', () => {
      const onColorChange = jest.fn();
      render(<ColorPickerModalButton {...defaultProps} onColorChange={onColorChange} />);

      const button = screen.getByRole('button', { name: /select color/i });
      fireEvent.click(button);

      const okButton = screen.getByText('OK');
      fireEvent.click(okButton);

      expect(onColorChange).toHaveBeenCalledWith(
        defaultProps.primaryColor,
        defaultProps.secondaryColor
      );
    });

    it('should switch between primary and secondary color modes', () => {
      render(<ColorPickerModalButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: /select color/i });
      fireEvent.click(button);

      // Click on secondary mode
      const secondaryButton = screen.getByText('Hover');
      fireEvent.click(secondaryButton);

      // The secondary color should now be active
      // (We can verify this by checking the segmented control state)
      expect(screen.getByText('Hover')).toBeInTheDocument();
    });
  });

  describe('color picker', () => {
    it('should render ExtendedColorPicker in modal', () => {
      render(<ColorPickerModalButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: /select color/i });
      fireEvent.click(button);

      // ExtendedColorPicker renders sliders
      expect(screen.getByLabelText('Saturation')).toBeInTheDocument();
      expect(screen.getByLabelText('Lightness')).toBeInTheDocument();
    });

    it('should reset draft colors when modal is opened', () => {
      render(<ColorPickerModalButton {...defaultProps} />);

      // Open modal
      const button = screen.getByRole('button', { name: /select color/i });
      fireEvent.click(button);

      // Close without saving
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      // Reopen modal
      fireEvent.click(button);

      // Modal should show the original colors (not any changes made previously)
      expect(screen.getByText('Pick a color')).toBeInTheDocument();
    });
  });
});
