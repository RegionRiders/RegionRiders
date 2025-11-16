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

    it('should include Poland in the list', () => {
      const countries = countryConfig.getAvailableCountries();
      const poland = countries.find((c) => c.code === 'PL');

      expect(poland).toBeDefined();
      expect(poland?.name).toBe('Poland');
      expect(poland?.fileName).toBe('poland.geojson');
    });

    it('should include Slovakia in the list', () => {
      const countries = countryConfig.getAvailableCountries();
      const slovakia = countries.find((c) => c.code === 'SK');

      expect(slovakia).toBeDefined();
      expect(slovakia?.name).toBe('Slovakia');
    });

    it('should include Hungary in the list', () => {
      const countries = countryConfig.getAvailableCountries();
      const hungary = countries.find((c) => c.code === 'HU');

      expect(hungary).toBeDefined();
      expect(hungary?.name).toBe('Hungary');
    });

    it('should include Germany in the list', () => {
      const countries = countryConfig.getAvailableCountries();
      const germany = countries.find((c) => c.code === 'DE');

      expect(germany).toBeDefined();
      expect(germany?.name).toBe('Germany');
    });

    it('should include France in the list', () => {
      const countries = countryConfig.getAvailableCountries();
      const france = countries.find((c) => c.code === 'FR');

      expect(france).toBeDefined();
      expect(france?.name).toBe('France');
    });

    it('should include Netherlands in the list', () => {
      const countries = countryConfig.getAvailableCountries();
      const netherlands = countries.find((c) => c.code === 'NL');

      expect(netherlands).toBeDefined();
      expect(netherlands?.name).toBe('Netherlands');
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
