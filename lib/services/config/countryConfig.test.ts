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

    it('should include Poland', () => {
      const countries = countryConfig.getAvailableCountries();

      const poland = countries.find((c) => c.code === 'PL');
      expect(poland).toBeDefined();
      expect(poland?.name).toBe('Poland');
      expect(poland?.fileName).toBe('poland.geojson');
    });

    it('should include Germany', () => {
      const countries = countryConfig.getAvailableCountries();

      const germany = countries.find((c) => c.code === 'DE');
      expect(germany).toBeDefined();
      expect(germany?.name).toBe('Germany');
      expect(germany?.fileName).toBe('germany.geojson');
    });

    it('should have unique country codes', () => {
      const countries = countryConfig.getAvailableCountries();
      const codes = countries.map((c) => c.code);
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should have .geojson file extensions', () => {
      const countries = countryConfig.getAvailableCountries();

      countries.forEach((country) => {
        expect(country.fileName).toMatch(/\.geojson$/);
      });
    });

    it('should return expected countries', () => {
      const countries = countryConfig.getAvailableCountries();
      const codes = countries.map((c) => c.code);

      expect(codes).toContain('PL');
      expect(codes).toContain('SK');
      expect(codes).toContain('HU');
      expect(codes).toContain('DE');
      expect(codes).toContain('FR');
      expect(codes).toContain('NL');
    });
  });
});