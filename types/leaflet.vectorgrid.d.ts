declare module 'leaflet.vectorgrid' {
  import * as L from 'leaflet';

  type VectorTileStyle =
    | L.PathOptions
    | ((properties: Record<string, unknown>, zoom: number) => L.PathOptions);

  interface VectorTileOptions {
    interactive?: boolean;
    pane?: string;
    minZoom?: number;
    maxZoom?: number;
    getFeatureId?: (feature: {
      properties?: Record<string, unknown>;
      id?: string | number;
    }) => string | number;
    vectorTileLayerStyles?: Record<string, VectorTileStyle>;
  }

  interface VectorGridLayer extends L.Layer {
    setFeatureStyle(featureId: string | number, style: L.PathOptions): void;
    resetFeatureStyle(featureId: string | number): void;
    setUrl(url: string, noRedraw?: boolean): this;
  }

  export const vectorGrid: {
    protobuf(url: string, options?: VectorTileOptions): VectorGridLayer;
  };

  export default vectorGrid;
}
