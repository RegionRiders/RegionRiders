import { ensureMapPane } from './ensureMapPane';

// Mock logger
jest.mock('@/lib/logger/client', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ensureMapPane', () => {
  it('should return early if map is not provided', () => {
    ensureMapPane(null, 'testPane', '400');

    // Should not throw
  });

  it('should return early if map.getPane is not available', () => {
    const mockMap = {};

    ensureMapPane(mockMap, 'testPane', '400');

    // Should not throw
  });

  it('should not create pane if it already exists', () => {
    const mockPane = { style: { zIndex: '200' } };
    const mockMap = {
      getPane: jest.fn(() => mockPane),
      createPane: jest.fn(),
    };

    ensureMapPane(mockMap, 'existingPane', '400');

    expect(mockMap.getPane).toHaveBeenCalledWith('existingPane');
    expect(mockMap.createPane).not.toHaveBeenCalled();
  });

  it('should create pane if it does not exist', () => {
    const newPane = { style: {} as { zIndex?: string } };
    const mockMap = {
      getPane: jest.fn(() => null),
      createPane: jest.fn(() => newPane),
    };

    ensureMapPane(mockMap, 'newPane', '500');

    expect(mockMap.getPane).toHaveBeenCalledWith('newPane');
    expect(mockMap.createPane).toHaveBeenCalledWith('newPane');
  });

  it('should set z-index on newly created pane', () => {
    const newPane = { style: {} as { zIndex?: string } };
    const mockMap = {
      getPane: jest.fn(() => null),
      createPane: jest.fn(() => newPane),
    };

    ensureMapPane(mockMap, 'newPane', '600');

    expect(newPane.style.zIndex).toBe('600');
  });

  it('should handle different pane names', () => {
    const newPane = { style: {} as { zIndex?: string } };
    const mockMap = {
      getPane: jest.fn(() => null),
      createPane: jest.fn(() => newPane),
    };

    ensureMapPane(mockMap, 'customPaneName', '700');

    expect(mockMap.createPane).toHaveBeenCalledWith('customPaneName');
  });

  it('should handle different z-index values', () => {
    const newPane = { style: {} as { zIndex?: string } };
    const mockMap = {
      getPane: jest.fn(() => null),
      createPane: jest.fn(() => newPane),
    };

    ensureMapPane(mockMap, 'pane', '999');

    expect(newPane.style.zIndex).toBe('999');
  });
});
