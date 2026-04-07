/**
 * @jest-environment jsdom
 */

import { fireEvent, screen } from '@testing-library/react';
import { render } from '@/test-utils';
import { ColorRgbaTextInput } from './ColorRgbaTextInput';

describe('ColorRgbaTextInput', () => {
  const defaultProps = {
    color: [255, 100, 50, 0.5] as [number, number, number, number],
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with initial color value', () => {
    render(<ColorRgbaTextInput {...defaultProps} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('rgba(255, 100, 50, 0.5)');
  });

  it('should allow text input', () => {
    render(<ColorRgbaTextInput {...defaultProps} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'rgba(0, 0, 0, 1)' } });

    expect(input).toHaveValue('rgba(0, 0, 0, 1)');
  });

  it('should call onChange with parsed color on blur', () => {
    const onChange = jest.fn();
    render(<ColorRgbaTextInput color={defaultProps.color} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'rgba(128, 64, 32, 0.8)' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith([128, 64, 32, 0.8]);
  });

  it('should reset to previous value on invalid input', () => {
    render(<ColorRgbaTextInput {...defaultProps} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'invalid color' } });
    fireEvent.blur(input);

    expect(input).toHaveValue('rgba(255, 100, 50, 0.5)');
  });

  it('should trigger blur on Enter key', () => {
    const onChange = jest.fn();
    render(<ColorRgbaTextInput color={defaultProps.color} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    const blurSpy = jest.spyOn(input, 'blur');

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(blurSpy).toHaveBeenCalled();
  });

  it('should update display when color prop changes', () => {
    const { rerender } = render(<ColorRgbaTextInput {...defaultProps} />);

    expect(screen.getByRole('textbox')).toHaveValue('rgba(255, 100, 50, 0.5)');

    rerender(<ColorRgbaTextInput color={[0, 255, 0, 1]} onChange={defaultProps.onChange} />);

    expect(screen.getByRole('textbox')).toHaveValue('rgba(0, 255, 0, 1)');
  });

  it('should update display when color prop changes while focused', () => {
    const { rerender } = render(<ColorRgbaTextInput {...defaultProps} />);

    const input = screen.getByRole('textbox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'typing...' } });

    rerender(<ColorRgbaTextInput color={[0, 255, 0, 1]} onChange={defaultProps.onChange} />);

    expect(screen.getByRole('textbox')).toHaveValue('rgba(0, 255, 0, 1)');
  });

  it('should have placeholder text', () => {
    render(<ColorRgbaTextInput {...defaultProps} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'rgba(255, 0, 0, 0.5)');
  });

  it('should parse hex colors', () => {
    const onChange = jest.fn();
    render(<ColorRgbaTextInput color={defaultProps.color} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '#ff0000' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith([255, 0, 0, 1]);
  });

  it('should parse rgb colors (without alpha)', () => {
    const onChange = jest.fn();
    render(<ColorRgbaTextInput color={defaultProps.color} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'rgb(100, 150, 200)' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith([100, 150, 200, 1]);
  });
});
