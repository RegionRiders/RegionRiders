import { countryConfig } from './countryConfig';

describe('countryConfig', () => {
  describe('getAvailableCountries', () => {
    it('should return an array of country data', () => {
      const countries = countryConfig.getAvailableCountries();

      expect(Array.isArray(countries)).toBe(true);
      expect(countries.length).toBeGreaterThan(0);
    });

    it('should return countries with required properties', () => {
      const countries = countryConfig.getAvailableCountries();

      countries.forEach((country) => {
        expect(country).toHaveProperty('code');
        expect(country).toHaveProperty('name');
        expect(country).toHaveProperty('fileName');
        expect(typeof country.code).toBe('string');
        expect(typeof country.name).toBe('string');
        expect(typeof country.fileName).toBe('string');
      });
    });

    it('should have unique country codes', () => {
      const countries = countryConfig.getAvailableCountries();
      const codes = countries.map((c) => c.code);
      const uniqueCodes = new Set(codes);

      expect(codes.length).toBe(uniqueCodes.size);
    });

    it('should have unique file names', () => {
      const countries = countryConfig.getAvailableCountries();
      const fileNames = countries.map((c) => c.fileName);
      const uniqueFileNames = new Set(fileNames);

      expect(fileNames.length).toBe(uniqueFileNames.size);
    });

    it('should have .geojson extension for all file names', () => {
      const countries = countryConfig.getAvailableCountries();

      countries.forEach((country) => {
        expect(country.fileName).toMatch(/\.geojson$/);
      });
    });
  });
});
