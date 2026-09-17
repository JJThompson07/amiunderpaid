import { describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
import {
  escapeHtml,
  getBrandName,
  renderBrandedEmail,
  resolveBrandFromHost
} from '../emailTemplate';

describe('server/utils/emailTemplate', () => {
  describe('escapeHtml', () => {
    it('escapes HTML special characters', () => {
      expect(escapeHtml(`<script>alert('x')</script> & "quoted"`)).toBe(
        '&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; &quot;quoted&quot;'
      );
    });

    it('returns an empty string for falsy input', () => {
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('getBrandName', () => {
    it('returns the display name for each brand', () => {
      expect(getBrandName('amiunderpaid')).toBe('AmIUnderpaid');
      expect(getBrandName('benchmarkmyrole')).toBe('BenchmarkMyRole');
    });
  });

  describe('resolveBrandFromHost', () => {
    const event = {} as unknown as H3Event;

    it('classifies a benchmarkmyrole host as the benchmarkmyrole brand', () => {
      vi.stubGlobal('getRequestHost', () => 'www.benchmarkmyrole.com');
      vi.stubGlobal('getRequestProtocol', () => 'https');

      const result = resolveBrandFromHost(event);

      expect(result).toEqual({
        brand: 'benchmarkmyrole',
        siteUrl: 'https://www.benchmarkmyrole.com'
      });
    });

    it('classifies any non-benchmarkmyrole host as the amiunderpaid brand', () => {
      vi.stubGlobal('getRequestHost', () => 'www.amiunderpaid.co.uk');
      vi.stubGlobal('getRequestProtocol', () => 'https');

      const result = resolveBrandFromHost(event);

      expect(result).toEqual({ brand: 'amiunderpaid', siteUrl: 'https://www.amiunderpaid.co.uk' });
    });

    it('preserves the request protocol (e.g. http for local dev)', () => {
      vi.stubGlobal('getRequestHost', () => 'localhost:3000');
      vi.stubGlobal('getRequestProtocol', () => 'http');

      const result = resolveBrandFromHost(event);

      expect(result).toEqual({ brand: 'amiunderpaid', siteUrl: 'http://localhost:3000' });
    });
  });

  describe('renderBrandedEmail', () => {
    const baseOptions = {
      siteUrl: 'https://www.amiunderpaid.co.uk',
      heading: 'Hello there',
      paragraphs: ['This is a test paragraph.']
    };

    it('defaults to the amiunderpaid brand when none is specified', () => {
      const html = renderBrandedEmail(baseOptions);

      expect(html).toContain('amiunderpaid-logo.png');
      expect(html).toContain('The Team at AmIUnderpaid');
    });

    it('renders the benchmarkmyrole brand when specified', () => {
      const html = renderBrandedEmail({ ...baseOptions, brand: 'benchmarkmyrole' });

      expect(html).toContain('benchmarkmyrole-logo.png');
      expect(html).toContain('The Team at BenchmarkMyRole');
    });

    it('uses the AmIUnderpaid primary teal for CTA buttons by default', () => {
      const html = renderBrandedEmail({
        ...baseOptions,
        cta: { label: 'Go', url: 'https://example.com' }
      });

      expect(html).toContain('#1cabb0');
    });

    it('uses the BenchmarkMyRole primary orange for CTA buttons when that brand is selected', () => {
      const html = renderBrandedEmail({
        ...baseOptions,
        brand: 'benchmarkmyrole',
        cta: { label: 'Go', url: 'https://example.com' }
      });

      expect(html).toContain('#dd8c40');
    });

    it('resolves the logo src from the provided siteUrl', () => {
      const html = renderBrandedEmail({
        ...baseOptions,
        siteUrl: 'https://www.benchmarkmyrole.com'
      });

      expect(html).toContain('src="https://www.benchmarkmyrole.com/amiunderpaid-logo.png"');
    });

    it('escapes HTML special characters in the heading and paragraphs', () => {
      const html = renderBrandedEmail({
        siteUrl: baseOptions.siteUrl,
        heading: '<b>Hi</b>',
        paragraphs: [`Tom & Jerry's "great" <adventure>`]
      });

      expect(html).not.toContain('<b>Hi</b>');
      expect(html).toContain('&lt;b&gt;Hi&lt;/b&gt;');
      expect(html).toContain('Tom &amp; Jerry&#39;s &quot;great&quot; &lt;adventure&gt;');
    });

    it('renders a data box with escaped labels and values when provided', () => {
      const html = renderBrandedEmail({
        ...baseOptions,
        dataBox: [
          { label: 'Name', value: 'Jane <Doe>' },
          { label: 'Role', value: 'Engineer' }
        ]
      });

      expect(html).toContain('Name');
      expect(html).toContain('Jane &lt;Doe&gt;');
      expect(html).toContain('Role');
      expect(html).toContain('Engineer');
    });

    it('omits the data box entirely when not provided', () => {
      const html = renderBrandedEmail(baseOptions);

      expect(html).not.toContain(
        'background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;'
      );
    });

    it('renders a credential box with the code, label, and optional note', () => {
      const html = renderBrandedEmail({
        ...baseOptions,
        credentialBox: { label: 'Temporary Password', code: 'abc123', note: 'Change this soon.' }
      });

      expect(html).toContain('Temporary Password');
      expect(html).toContain('abc123');
      expect(html).toContain('Change this soon.');
    });

    it('renders a credential box without a note when none is provided', () => {
      const html = renderBrandedEmail({
        ...baseOptions,
        credentialBox: { label: 'Code', code: 'xyz789' }
      });

      expect(html).toContain('xyz789');
    });

    it('renders a CTA button with an escaped label and URL when provided', () => {
      const html = renderBrandedEmail({
        ...baseOptions,
        cta: { label: 'View <Now>', url: 'https://example.com/dashboard?x=1&y=2' }
      });

      expect(html).toContain('View &lt;Now&gt;');
      expect(html).toContain('https://example.com/dashboard?x=1&amp;y=2');
    });

    it('omits the CTA button entirely when not provided', () => {
      const html = renderBrandedEmail(baseOptions);

      expect(html).not.toContain('border-radius: 9999px');
    });

    it('includes a footer with the current year and site URL', () => {
      const html = renderBrandedEmail(baseOptions);

      expect(html).toContain(`${new Date().getFullYear()}`);
      expect(html).toContain('www.amiunderpaid.co.uk');
    });
  });
});
