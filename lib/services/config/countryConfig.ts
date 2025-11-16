import { CountryData } from '../cache/regionCache';

/**
 * configuration for available countries and their geojson data files
 */
export const countryConfig = {
  /**
   * returns list of all countries with region data available
   *
   * @returns array of country metadata with codes, names, and filenames
   */
  getAvailableCountries(): CountryData[] {
    return [
      { code: 'PL', name: 'Poland', fileName: 'poland.geojson' },
      { code: 'SK', name: 'Slovakia', fileName: 'slovakia.geojson' },
      { code: 'HU', name: 'Hungary', fileName: 'hungary.geojson' },
      { code: 'DE', name: 'Germany', fileName: 'germany.geojson' },
      { code: 'FR', name: 'France', fileName: 'france.geojson' },
      { code: 'NL', name: 'Netherlands', fileName: 'netherlands.geojson' },
    ];
  },
};
