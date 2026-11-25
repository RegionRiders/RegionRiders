type EventHandler = (...args: any[]) => void;

export interface MockMapLibreInstance {
  addSource: jest.Mock;
  removeSource: jest.Mock;
  getSource: jest.Mock;
  addLayer: jest.Mock;
  removeLayer: jest.Mock;
  getLayer: jest.Mock;
  setPaintProperty: jest.Mock;
  setFilter: jest.Mock;
  setFeatureState: jest.Mock;
  removeFeatureState: jest.Mock;
  on: jest.Mock;
  once: jest.Mock;
  off: jest.Mock;
  remove: jest.Mock;
  loaded: jest.Mock;
  getCenter: jest.Mock;
  getZoom: jest.Mock;
  getCanvas: jest.Mock;
  queryRenderedFeatures: jest.Mock;
  triggerRepaint: jest.Mock;
  project: jest.Mock;
  unproject: jest.Mock;
  _emit: (event: string, ...args: any[]) => void;
  _emitLayer: (event: string, layerId: string, ...args: any[]) => void;
  _sources: Map<string, any>;
  _layers: Map<string, any>;
  _paint: Map<string, Record<string, any>>;
  _featureStates: Map<string, Record<string, any>>;
}

export function createMockMapLibreInstance(
  overrides: { center?: { lat: number; lng: number }; zoom?: number; loaded?: boolean } = {}
): MockMapLibreInstance {
  const sources = new Map<string, any>();
  const layers = new Map<string, any>();
  const paint = new Map<string, Record<string, any>>();
  const featureStates = new Map<string, Record<string, any>>();
  const listeners = new Map<string, Set<EventHandler>>();
  const layerListeners = new Map<string, Set<EventHandler>>();

  const canvas = {
    style: { cursor: '' },
    width: 800,
    height: 600,
    clientWidth: 800,
    clientHeight: 600,
  };

  const map: MockMapLibreInstance = {
    _sources: sources,
    _layers: layers,
    _paint: paint,
    _featureStates: featureStates,
    addSource: jest.fn((id: string, spec: any) => {
      const sourceObj = {
        ...spec,
        setData: jest.fn((data: any) => {
          sourceObj.data = data;
        }),
      };
      sources.set(id, sourceObj);
    }),
    removeSource: jest.fn((id: string) => {
      sources.delete(id);
    }),
    getSource: jest.fn((id: string) => sources.get(id)),
    addLayer: jest.fn((layer: any) => {
      layers.set(layer.id, layer);
      if (layer.paint) {
        paint.set(layer.id, { ...layer.paint });
      }
    }),
    removeLayer: jest.fn((id: string) => {
      layers.delete(id);
      paint.delete(id);
    }),
    getLayer: jest.fn((id: string) => layers.get(id)),
    setPaintProperty: jest.fn((layerId: string, prop: string, value: any) => {
      const existing = paint.get(layerId) ?? {};
      existing[prop] = value;
      paint.set(layerId, existing);
    }),
    setFilter: jest.fn(),
    setFeatureState: jest.fn(
      (
        target: { source: string; sourceLayer?: string; id: string | number },
        state: Record<string, any>
      ) => {
        const key = `${target.source}:${target.sourceLayer ?? ''}:${target.id}`;
        featureStates.set(key, { ...(featureStates.get(key) ?? {}), ...state });
      }
    ),
    removeFeatureState: jest.fn(
      (target: { source: string; sourceLayer?: string; id?: string | number }) => {
        const key = `${target.source}:${target.sourceLayer ?? ''}:${target.id ?? ''}`;
        featureStates.delete(key);
      }
    ),
    on: jest.fn(
      (event: string, layerOrHandler: string | EventHandler, maybeHandler?: EventHandler) => {
        if (typeof layerOrHandler === 'string' && maybeHandler) {
          const key = `${event}:${layerOrHandler}`;
          if (!layerListeners.has(key)) {
            layerListeners.set(key, new Set());
          }
          layerListeners.get(key)!.add(maybeHandler);
          return;
        }
        const handler = layerOrHandler as EventHandler;
        if (!listeners.has(event)) {
          listeners.set(event, new Set());
        }
        listeners.get(event)!.add(handler);
      }
    ),
    once: jest.fn((event: string, handler: EventHandler) => {
      const wrapped: EventHandler = (...args) => {
        listeners.get(event)?.delete(wrapped);
        handler(...args);
      };
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(wrapped);
    }),
    off: jest.fn(
      (event: string, layerOrHandler: string | EventHandler, maybeHandler?: EventHandler) => {
        if (typeof layerOrHandler === 'string' && maybeHandler) {
          layerListeners.get(`${event}:${layerOrHandler}`)?.delete(maybeHandler);
          return;
        }
        listeners.get(event)?.delete(layerOrHandler as EventHandler);
      }
    ),
    remove: jest.fn(),
    loaded: jest.fn(() => overrides.loaded ?? false),
    getCenter: jest.fn(() => overrides.center ?? { lat: 54.352375, lng: 18.656686 }),
    getZoom: jest.fn(() => overrides.zoom ?? 10),
    getCanvas: jest.fn(() => canvas),
    queryRenderedFeatures: jest.fn(() => []),
    triggerRepaint: jest.fn(),
    project: jest.fn((lngLat: [number, number] | { lng: number; lat: number }) => {
      const lng = Array.isArray(lngLat) ? lngLat[0] : lngLat.lng;
      const lat = Array.isArray(lngLat) ? lngLat[1] : lngLat.lat;
      return { x: lng * 100, y: lat * 100 };
    }),
    unproject: jest.fn((point: [number, number] | { x: number; y: number }) => {
      const x = Array.isArray(point) ? point[0] : point.x;
      const y = Array.isArray(point) ? point[1] : point.y;
      return { lng: x / 100, lat: y / 100 };
    }),
    _emit: (event: string, ...args: any[]) => {
      listeners.get(event)?.forEach((fn) => fn(...args));
    },
    _emitLayer: (event: string, layerId: string, ...args: any[]) => {
      layerListeners.get(`${event}:${layerId}`)?.forEach((fn) => fn(...args));
    },
  };

  return map;
}
