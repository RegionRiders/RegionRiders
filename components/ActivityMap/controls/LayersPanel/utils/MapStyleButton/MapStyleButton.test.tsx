/**
 * @jest-environment jsdom
 */

import { fireEvent, screen } from '@testing-library/react';
import { render } from '@/test-utils';
import MapStyleButton from './MapStyleButton';

describe('MapStyleButton', () => {
  const defaultProps = {
    label: 'Layers',
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render with label', () => {
      render(<MapStyleButton {...defaultProps} />);

      expect(screen.getByText('Layers')).toBeInTheDocument();
    });

    it('should render with default image', () => {
      const { container } = render(<MapStyleButton {...defaultProps} />);

      const images = container.querySelectorAll('img');
      expect(images.length).toBeGreaterThan(0);
    });

    it('should render with custom image url', () => {
      const { container } = render(
        <MapStyleButton {...defaultProps} imageUrl="https://example.com/tile.png" />
      );

      const images = container.querySelectorAll('img');
      expect(images[0]).toHaveAttribute('src', 'https://example.com/tile.png');
    });

    it('should have correct aria-label', () => {
      render(<MapStyleButton {...defaultProps} aria-label="Custom label" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom label');
    });

    it('should use default aria-label when not provided', () => {
      render(<MapStyleButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Toggle panel');
    });
  });

  describe('interaction', () => {
    it('should call onClick when clicked', () => {
      const onClick = jest.fn();
      render(<MapStyleButton {...defaultProps} onClick={onClick} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should have aria-expanded false by default', () => {
      render(<MapStyleButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have aria-expanded true when active', () => {
      render(<MapStyleButton {...defaultProps} active />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('image transitions', () => {
    it('should display the initial image URL', () => {
      const { container } = render(
        <MapStyleButton {...defaultProps} imageUrl="https://example.com/tile1.png" />
      );

      const images = container.querySelectorAll('img');
      expect(images[0]).toHaveAttribute('src', 'https://example.com/tile1.png');
    });

    it('should handle image url prop changes', () => {
      const { rerender } = render(
        <MapStyleButton {...defaultProps} imageUrl="https://example.com/tile1.png" />
      );

      // Change the image URL - component should not crash
      rerender(<MapStyleButton {...defaultProps} imageUrl="https://example.com/tile2.png" />);

      // Component should still be rendered
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle rapid URL changes', () => {
      const { rerender } = render(
        <MapStyleButton {...defaultProps} imageUrl="https://example.com/tile1.png" />
      );

      // Rapidly change URLs
      rerender(<MapStyleButton {...defaultProps} imageUrl="https://example.com/tile2.png" />);
      rerender(<MapStyleButton {...defaultProps} imageUrl="https://example.com/tile3.png" />);

      // Component should still render
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply fullWidth class when fullWidth is true', () => {
      render(<MapStyleButton {...defaultProps} fullWidth />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('FullWidth');
    });

    it('should apply active class when active is true', () => {
      render(<MapStyleButton {...defaultProps} active />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('Active');
    });
  });
});
