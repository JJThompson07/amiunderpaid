import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useHostCountry } from '../useHostCountry';

const mockHost = { value: 'localhost:3000' };

vi.stubGlobal('useRequestURL', () => ({
  get host(): string {
    return mockHost.value;
  }
}));
vi.stubGlobal('computed', <T>(fn: () => T) => ({
  get value(): T {
    return fn();
  }
}));

describe('useHostCountry', () => {
  beforeEach(() => {
    mockHost.value = 'localhost:3000';
  });

  it('resolves the bare local dev host to UK', () => {
    mockHost.value = 'localhost:3000';
    expect(useHostCountry().hostCountry.value).toBe('UK');
  });

  it('resolves the 127.0.0.1 local dev host to UK', () => {
    mockHost.value = '127.0.0.1:3000';
    expect(useHostCountry().hostCountry.value).toBe('UK');
  });

  it('resolves the ami-uk local dev host to UK', () => {
    mockHost.value = 'ami-uk.localhost:3000';
    expect(useHostCountry().hostCountry.value).toBe('UK');
  });

  it('resolves the ami-us local dev host to USA', () => {
    mockHost.value = 'ami-us.localhost:3000';
    expect(useHostCountry().hostCountry.value).toBe('USA');
  });

  it('resolves the production UK domain to UK', () => {
    mockHost.value = 'www.amiunderpaid.co.uk';
    expect(useHostCountry().hostCountry.value).toBe('UK');
  });

  it('resolves the production USA domain to USA', () => {
    mockHost.value = 'www.amiunderpaid.com';
    expect(useHostCountry().hostCountry.value).toBe('USA');
  });

  it('generates the local dev alternate site URL from the UK site', () => {
    mockHost.value = 'localhost:3000';
    expect(useHostCountry().alternateSiteBaseUrl.value).toBe('http://ami-us.localhost:3000');
  });

  it('generates the local dev alternate site URL from the USA site', () => {
    mockHost.value = 'ami-us.localhost:3000';
    expect(useHostCountry().alternateSiteBaseUrl.value).toBe('http://ami-uk.localhost:3000');
  });

  it('generates the production alternate site URL from the UK site', () => {
    mockHost.value = 'www.amiunderpaid.co.uk';
    expect(useHostCountry().alternateSiteBaseUrl.value).toBe('https://www.amiunderpaid.com');
  });

  it('generates the production alternate site URL from the USA site', () => {
    mockHost.value = 'www.amiunderpaid.com';
    expect(useHostCountry().alternateSiteBaseUrl.value).toBe('https://www.amiunderpaid.co.uk');
  });
});
