import { describe, expect, it } from 'vitest';
import { generateColorScale, hexToHsl, hslToHex, SHADE_STOPS } from '../color';

describe('color utils', () => {
  describe('hexToHsl', () => {
    it('converts pure red', () => {
      const { h, s, l } = hexToHsl('#ff0000');
      expect(h).toBeCloseTo(0, 0);
      expect(s).toBeCloseTo(1, 1);
      expect(l).toBeCloseTo(0.5, 1);
    });

    it('converts pure white to zero saturation, full lightness', () => {
      const { s, l } = hexToHsl('#ffffff');
      expect(s).toBe(0);
      expect(l).toBe(1);
    });

    it('converts pure black to zero saturation, zero lightness', () => {
      const { s, l } = hexToHsl('#000000');
      expect(s).toBe(0);
      expect(l).toBe(0);
    });

    it('converts a neutral gray to zero saturation', () => {
      const { s } = hexToHsl('#808080');
      expect(s).toBe(0);
    });
  });

  describe('hslToHex', () => {
    it('converts hue 0, full saturation, mid lightness back to red', () => {
      expect(hslToHex(0, 1, 0.5)).toBe('#ff0000');
    });

    it('produces a gray (equal channels) when saturation is 0', () => {
      const hex = hslToHex(120, 0, 0.5);
      const r = hex.slice(1, 3);
      const g = hex.slice(3, 5);
      const b = hex.slice(5, 7);
      expect(r).toBe(g);
      expect(g).toBe(b);
    });

    it('round-trips through hexToHsl within rounding tolerance', () => {
      const original = '#3c83bb';
      const { h, s, l } = hexToHsl(original);
      const roundTripped = hslToHex(h, s, l);
      const { h: h2, s: s2, l: l2 } = hexToHsl(roundTripped);
      expect(h2).toBeCloseTo(h, 0);
      expect(s2).toBeCloseTo(s, 1);
      expect(l2).toBeCloseTo(l, 1);
    });
  });

  describe('generateColorScale', () => {
    it('produces the exact expected scale for a known hue/saturation seed', () => {
      // hsl(0, 60%, ~55%) ~= #d14747 -- exact values cross-checked against an
      // independent reference HSL-to-RGB implementation, so this isn't just
      // testing itself against its own hslToHex.
      const scale = generateColorScale('#d14747');
      expect(scale).toEqual({
        '50': '#fcf3f3',
        '100': '#f9e7e7',
        '200': '#f2caca',
        '300': '#e8a1a1',
        '400': '#db7070',
        '500': '#d14747',
        '600': '#b82e2e',
        '700': '#932525',
        '800': '#721d1d',
        '900': '#521414'
      });
    });

    it('returns exactly the 10 documented shade stops', () => {
      const scale = generateColorScale('#3c83bb');
      expect(Object.keys(scale).sort()).toEqual([...SHADE_STOPS].sort());
    });

    it('gets monotonically darker from 50 to 900', () => {
      const scale = generateColorScale('#2f67bc');
      const lightnesses = SHADE_STOPS.map((stop) => hexToHsl(scale[stop]).l);
      for (let i = 1; i < lightnesses.length; i++) {
        expect(lightnesses[i]).toBeLessThan(lightnesses[i - 1]!);
      }
    });

    it('preserves hue across every stop', () => {
      const scale = generateColorScale('#5acc3e');
      const seedHue = hexToHsl('#5acc3e').h;
      for (const stop of SHADE_STOPS) {
        // 50/900 are near-white/near-black, where hue becomes numerically
        // unstable (low chroma) -- skip those two, check the rest tightly.
        if (stop === '50' || stop === '900') {
          continue;
        }
        expect(hexToHsl(scale[stop]).h).toBeCloseTo(seedHue, -1);
      }
    });

    it('produces a true grayscale ramp for a saturation-0 input', () => {
      const scale = generateColorScale('#808080');
      for (const stop of SHADE_STOPS) {
        const hex = scale[stop];
        const r = hex.slice(1, 3);
        const g = hex.slice(3, 5);
        const b = hex.slice(5, 7);
        expect(r).toBe(g);
        expect(g).toBe(b);
      }
    });

    it('produces visibly different scales for different hues', () => {
      const red = generateColorScale('#bc2f2f');
      const blue = generateColorScale('#2f67bc');
      expect(red['500']).not.toBe(blue['500']);
      expect(red['100']).not.toBe(blue['100']);
    });
  });
});
