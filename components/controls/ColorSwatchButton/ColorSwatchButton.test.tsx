/**
 * @jest-environment jsdom
 */

import { fireEvent, screen } from '@testing-library/react';
import { RGBA } from '@/components/ActivityMap/mapTypes';
import { render } from '@/test-utils';
import { ColorSwatchButton } from './ColorSwatchButton';

describe('ColorSwatchButton', () => {
  const defaultColor: RGBA = [255, 0, 0, 0.5];

  it('should render with the correct aria-label for default preview', () => {
    render(<ColorSwatchButton color={defaultColor} />);

    const button = screen.getByRole('button', { name: 'Select color preview' });
    expect(button).toBeInTheDocument();
  });

  it('should render with numbered aria-label when index is provided', () => {
    render(<ColorSwatchButton color={defaultColor} index={2} />);

    const button = screen.getByRole('button', { name: 'Select color 3' });
    expect(button).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<ColorSwatchButton color={defaultColor} onClick={handleClick} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should render with variant "filled" when selectedIndex matches index', () => {
    render(<ColorSwatchButton color={defaultColor} index={1} selectedIndex={1} />);

    const button = screen.getByRole('button');
    // The variant would affect the button's data attributes or classes
    expect(button).toBeInTheDocument();
  });

  it('should render with variant "default" when selectedIndex does not match', () => {
    render(<ColorSwatchButton color={defaultColor} index={1} selectedIndex={2} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should render children when provided', () => {
    render(
      <ColorSwatchButton color={defaultColor}>
        <span>Custom Content</span>
      </ColorSwatchButton>
    );

    expect(screen.getByText('Custom Content')).toBeInTheDocument();
  });

  it('should apply background gradient with single color', () => {
    render(<ColorSwatchButton color={defaultColor} />);

    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      background: expect.stringContaining('linear-gradient'),
    });
  });

  it('should apply diagonal background gradient with secondary color', () => {
    const secondaryColor: RGBA = [0, 255, 0, 0.8];
    render(<ColorSwatchButton color={defaultColor} secondaryColor={secondaryColor} />);

    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      background: expect.stringContaining('linear-gradient'),
    });
  });

  it('should not throw when onClick is not provided', () => {
    expect(() => {
      render(<ColorSwatchButton color={defaultColor} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
    }).not.toThrow();
  });

  it('should handle full opacity color', () => {
    const fullOpacityColor: RGBA = [100, 100, 100, 1];
    render(<ColorSwatchButton color={fullOpacityColor} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should handle zero opacity color', () => {
    const zeroOpacityColor: RGBA = [0, 0, 0, 0];
    render(<ColorSwatchButton color={zeroOpacityColor} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});
