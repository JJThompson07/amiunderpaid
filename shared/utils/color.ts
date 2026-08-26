/**
 * Generates a Tailwind-style 50-900 tonal scale from a single hex color, so
 * a runtime-computed color (e.g. one entry of a categorical chart palette)
 * can be used the same way this app's static palettes are used elsewhere --
 * a light tint for a badge background, a dark shade for its text, a mid
 * tone for the "main" color -- without needing to hand-author a full scale
 * for every possible color.
 *
 * Deterministic: only the input's hue and saturation are used as the seed;
 * lightness is re-derived per stop from a fixed target ramp, so the same
 * hue+saturation always produces the same scale regardless of the input
 * hex's own lightness.
 */

export const SHADE_STOPS = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900'
] as const;

export type Shade = (typeof SHADE_STOPS)[number];
export type ColorScale = Record<Shade, string>;

type HSL = { h: number; s: number; l: number };

/** Target lightness (0-1) for each stop, independent of the input color. */
const SHADE_LIGHTNESS: Record<Shade, number> = {
  '50': 0.97,
  '100': 0.94,
  '200': 0.87,
  '300': 0.77,
  '400': 0.65,
  '500': 0.55,
  '600': 0.45,
  '700': 0.36,
  '800': 0.28,
  '900': 0.2
};

export const hexToHsl = (hex: string): HSL => {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === r) {
    h = (g - b) / d + (g < b ? 6 : 0);
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }
  h *= 60;

  return { h, s, l };
};

export const hslToHex = (h: number, s: number, l: number): string => {
  const hueToRgb = (p: number, q: number, tIn: number): number => {
    let t = tIn;
    if (t < 0) {
      t += 1;
    }
    if (t > 1) {
      t -= 1;
    }
    if (t < 1 / 6) {
      return p + (q - p) * 6 * t;
    }
    if (t < 1 / 2) {
      return q;
    }
    if (t < 2 / 3) {
      return p + (q - p) * (2 / 3 - t) * 6;
    }
    return p;
  };

  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h / 360 + 1 / 3);
    g = hueToRgb(p, q, h / 360);
    b = hueToRgb(p, q, h / 360 - 1 / 3);
  }

  const toHex = (x: number): string => {
    const hex = Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const generateColorScale = (hex: string): ColorScale => {
  const { h, s } = hexToHsl(hex);
  const scale = {} as ColorScale;
  for (const stop of SHADE_STOPS) {
    scale[stop] = hslToHex(h, s, SHADE_LIGHTNESS[stop]);
  }
  return scale;
};
