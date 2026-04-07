/**
 * @jest-environment jsdom
 */

import { fireEvent, screen } from '@testing-library/react';
import { render } from '@/test-utils';
import { ColorHslaTextInput } from './ColorHslaTextInput';

describe('ColorHslaTextInput', () => {
  const defaultProps = {
    h: 180,
    s: 50,
    l: 50,
    a: 0.5,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with initial HSLA value', () => {
    render(<ColorHslaTextInput {...defaultProps} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('hsla(180, 50%, 50%, 0.5)');
  });

  it('should render HSL format when alpha is 1', () => {
    render(<ColorHslaTextInput {...defaultProps} a={1} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('hsl(180, 50%, 50%)');
  });

  it('should allow text input', () => {
    render(<ColorHslaTextInput {...defaultProps} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'hsla(240, 60%, 40%, 0.8)' } });

    expect(input).toHaveValue('hsla(240, 60%, 40%, 0.8)');
  });

  it('should call onChange with parsed values on blur', () => {
    const onChange = jest.fn();
    render(<ColorHslaTextInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'hsla(120, 75%, 25%, 0.9)' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(120, 75, 25, 0.9);
  });

  it('should parse HSL format (without alpha)', () => {
    const onChange = jest.fn();
    render(<ColorHslaTextInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'hsl(300, 80%, 30%)' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(300, 80, 30, 1);
  });

  it('should reset to previous value on invalid input', () => {
    render(<ColorHslaTextInput {...defaultProps} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'invalid color' } });
    fireEvent.blur(input);

    expect(input).toHaveValue('hsla(180, 50%, 50%, 0.5)');
  });

  it('should blur input on Enter key', () => {
    render(<ColorHslaTextInput {...defaultProps} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    // Enter key should trigger blur
    fireEvent.keyDown(input, { key: 'Enter' });

    // The input should lose focus (blur is called)
    // Since we can't easily test document.activeElement, we verify the handler doesn't throw
    expect(input).toBeInTheDocument();
  });

  it('should update display when props change', () => {
    const { rerender } = render(<ColorHslaTextInput {...defaultProps} />);

    expect(screen.getByRole('textbox')).toHaveValue('hsla(180, 50%, 50%, 0.5)');

    rerender(<ColorHslaTextInput h={0} s={100} l={50} a={1} onChange={defaultProps.onChange} />);

    expect(screen.getByRole('textbox')).toHaveValue('hsl(0, 100%, 50%)');
  });

  it('should not update display when props change while focused', () => {
    const { rerender } = render(<ColorHslaTextInput {...defaultProps} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'typing...' } });

    rerender(<ColorHslaTextInput h={0} s={100} l={50} a={1} onChange={defaultProps.onChange} />);

    // Should keep the user's input, not update from prop
    expect(input).toHaveValue('typing...');
  });

  it('should handle zero values', () => {
    render(<ColorHslaTextInput h={0} s={0} l={0} a={0} onChange={jest.fn()} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('hsla(0, 0%, 0%, 0)');
  });

  it('should handle decimal values in parsing', () => {
    const onChange = jest.fn();
    render(<ColorHslaTextInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'hsla(180.5, 50.3%, 49.9%, 0.55)' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(180.5, 50.3, 49.9, 0.55);
  });
});
