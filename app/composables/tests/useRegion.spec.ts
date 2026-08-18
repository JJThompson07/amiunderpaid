import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRegion } from '../useRegion';

const mockLocale = { value: 'en-GB' };
const mockHostname = { value: 'localhost' };

vi.stubGlobal('useI18n', () => ({ locale: mockLocale }));
vi.stubGlobal('useRequestURL', () => ({
  get hostname(): string {
    return mockHostname.value;
  }
}));
vi.stubGlobal('computed', <T>(fn: () => T) => ({
  get value(): T {
    return fn();
  }
}));

describe('useRegion', () => {
  beforeEach(() => {
    mockLocale.value = 'en-GB';
    mockHostname.value = 'localhost';
  });

  it('determines UK site properties correctly', () => {
    mockLocale.value = 'en-GB';
    const region = useRegion();

    expect(region.isUKSite.value).toBe(true);
    expect(region.isUSSite.value).toBe(false);
    expect(region.currentCountry.value).toBe('UK');
    expect(region.currencySymbol.value).toBe('£');
  });

  it('determines US site properties correctly', () => {
    mockLocale.value = 'en-US';
    const region = useRegion();

    expect(region.isUKSite.value).toBe(false);
    expect(region.isUSSite.value).toBe(true);
    expect(region.currentCountry.value).toBe('USA');
    expect(region.currencySymbol.value).toBe('$');
  });

  it('generates alternate site URL for local UK site', () => {
    mockLocale.value = 'en-GB';
    mockHostname.value = 'localhost';
    const region = useRegion();
    expect(region.alternateSiteUrl.value).toBe('http://ami-us.localhost:3000');
  });

  it('generates alternate site URL for local US site', () => {
    mockLocale.value = 'en-US';
    mockHostname.value = '127.0.0.1';
    const region = useRegion();
    expect(region.alternateSiteUrl.value).toBe('http://ami-uk.localhost:3000');
  });

  it('generates alternate site URL for prod UK site', () => {
    mockLocale.value = 'en-GB';
    mockHostname.value = 'www.amiunderpaid.co.uk';
    const region = useRegion();
    expect(region.alternateSiteUrl.value).toBe('https://www.amiunderpaid.com');
  });

  it('generates alternate site URL for prod US site', () => {
    mockLocale.value = 'en-US';
    mockHostname.value = 'www.amiunderpaid.com';
    const region = useRegion();
    expect(region.alternateSiteUrl.value).toBe('https://www.amiunderpaid.co.uk');
  });
});
