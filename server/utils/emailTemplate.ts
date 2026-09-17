import type { H3Event } from 'h3';

export type EmailBrand = 'amiunderpaid' | 'benchmarkmyrole';

type BrandConfig = {
  brandName: string;
  logoFile: string;
  primaryColor: string;
  primaryColorDark: string;
  primaryColorTint: string;
};

const BRANDS: Record<EmailBrand, BrandConfig> = {
  amiunderpaid: {
    brandName: 'AmIUnderpaid',
    logoFile: 'amiunderpaid-logo.png',
    primaryColor: '#1cabb0',
    primaryColorDark: '#14868d',
    primaryColorTint: '#f1fcfc'
  },
  benchmarkmyrole: {
    brandName: 'BenchmarkMyRole',
    logoFile: 'benchmarkmyrole-logo.png',
    primaryColor: '#dd8c40',
    primaryColorDark: '#cd6d29',
    primaryColorTint: '#fdf8ef'
  }
};

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const TEXT_DARK = '#0f172a';
const TEXT_MUTED = '#475569';
const BORDER_COLOR = '#e2e8f0';

export type DataBoxItem = {
  label: string;
  value: string;
};

export type CredentialBox = {
  label: string;
  code: string;
  note?: string;
};

export type CtaButton = {
  label: string;
  url: string;
};

export type BrandedEmailOptions = {
  brand?: EmailBrand;
  siteUrl: string;
  heading: string;
  paragraphs: string[];
  dataBox?: DataBoxItem[];
  credentialBox?: CredentialBox;
  cta?: CtaButton;
};

/**
 * Resolves which brand and origin a Nitro request belongs to. Client-side brand
 * detection (`app/plugins/tenant.ts`) runs only in the Vue render tree and is not
 * reachable from `server/api/**`, and this repo is a single Vercel project serving
 * all brand domains off one deployment, so `useRuntimeConfig().public.siteUrl` cannot
 * stand in for "the current domain" either -- the request itself is the only
 * reliable source for both.
 */
export function resolveBrandFromHost(event: H3Event): { brand: EmailBrand; siteUrl: string } {
  const host = getRequestHost(event);
  const protocol = getRequestProtocol(event);
  const brand: EmailBrand = host.includes('benchmarkmyrole') ? 'benchmarkmyrole' : 'amiunderpaid';
  return { brand, siteUrl: `${protocol}://${host}` };
}

/** The brand's display name, e.g. for use in a plaintext (`message.text`) sign-off. */
export function getBrandName(brand: EmailBrand): string {
  return BRANDS[brand].brandName;
}

export function escapeHtml(text: string): string {
  if (!text) {
    return '';
  }
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderLogoHeader(brandConfig: BrandConfig, siteUrl: string): string {
  const logoUrl = `${siteUrl}/${brandConfig.logoFile}`;
  return `
    <tr>
      <td align="center" style="padding: 32px 24px 16px 24px;">
        <a href="${siteUrl}" target="_blank" rel="noopener noreferrer">
          <img src="${logoUrl}" alt="${escapeHtml(brandConfig.brandName)}" width="160" height="40" style="display: block; border: 0; max-width: 160px; height: auto;" />
        </a>
      </td>
    </tr>`;
}

function renderDataBox(items: DataBoxItem[]): string {
  const rows = items
    .map(
      (item, index) => `
        <tr>
          <td style="padding: 10px 16px; ${index > 0 ? `border-top: 1px solid ${BORDER_COLOR};` : ''} font-size: 13px; color: ${TEXT_MUTED}; width: 40%;">${escapeHtml(item.label)}</td>
          <td style="padding: 10px 16px; ${index > 0 ? `border-top: 1px solid ${BORDER_COLOR};` : ''} font-size: 14px; color: ${TEXT_DARK}; font-weight: 600;">${escapeHtml(item.value)}</td>
        </tr>`
    )
    .join('');

  return `
    <tr>
      <td style="padding: 8px 24px 8px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid ${BORDER_COLOR}; border-radius: 8px;">
          ${rows}
        </table>
      </td>
    </tr>`;
}

function renderCredentialBox(credentialBox: CredentialBox, brandConfig: BrandConfig): string {
  const note = credentialBox.note
    ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: ${TEXT_MUTED};">${escapeHtml(credentialBox.note)}</p>`
    : '';

  return `
    <tr>
      <td style="padding: 8px 24px 8px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${brandConfig.primaryColorTint}; border: 1px solid ${brandConfig.primaryColor}; border-radius: 8px;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: ${TEXT_MUTED};">${escapeHtml(credentialBox.label)}</p>
              <p style="margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 20px; font-weight: 700; color: ${TEXT_DARK}; letter-spacing: 0.05em;">${escapeHtml(credentialBox.code)}</p>
              ${note}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderCtaButton(cta: CtaButton, brandConfig: BrandConfig): string {
  return `
    <tr>
      <td align="center" style="padding: 16px 24px 8px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="border-radius: 9999px; background-color: ${brandConfig.primaryColor};">
              <a href="${escapeHtml(cta.url)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 32px; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 9999px;">${escapeHtml(cta.label)}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderSignOff(brandConfig: BrandConfig): string {
  return `
    <tr>
      <td style="padding: 24px 24px 8px 24px; font-size: 14px; color: ${TEXT_DARK};">
        <p style="margin: 0;">Best regards,<br />The Team at ${escapeHtml(brandConfig.brandName)}</p>
      </td>
    </tr>`;
}

function renderFooter(siteUrl: string, brandConfig: BrandConfig): string {
  const year = new Date().getFullYear();
  return `
    <tr>
      <td align="center" style="padding: 24px; font-size: 12px; color: #94a3b8; border-top: 1px solid ${BORDER_COLOR};">
        <p style="margin: 0;">&copy; ${year} ${escapeHtml(brandConfig.brandName)}. All rights reserved.</p>
        <p style="margin: 4px 0 0 0;"><a href="${siteUrl}" target="_blank" rel="noopener noreferrer" style="color: #94a3b8;">${siteUrl.replace(/^https?:\/\//, '')}</a></p>
      </td>
    </tr>`;
}

export function renderBrandedEmail(options: BrandedEmailOptions): string {
  const brand = options.brand ?? 'amiunderpaid';
  const brandConfig = BRANDS[brand];

  const paragraphsHtml = options.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: ${TEXT_DARK};">${escapeHtml(paragraph)}</p>`
    )
    .join('');

  const dataBoxHtml = options.dataBox ? renderDataBox(options.dataBox) : '';
  const credentialBoxHtml = options.credentialBox
    ? renderCredentialBox(options.credentialBox, brandConfig)
    : '';
  const ctaHtml = options.cta ? renderCtaButton(options.cta, brandConfig) : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(brandConfig.brandName)}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: ${FONT_STACK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
      <tr>
        <td align="center" style="padding: 24px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border: 1px solid ${BORDER_COLOR}; border-radius: 8px;">
            ${renderLogoHeader(brandConfig, options.siteUrl)}
            <tr>
              <td style="padding: 8px 24px 8px 24px;">
                <h2 style="margin: 0 0 16px 0; font-size: 20px; color: ${TEXT_DARK};">${escapeHtml(options.heading)}</h2>
                ${paragraphsHtml}
              </td>
            </tr>
            ${dataBoxHtml}
            ${credentialBoxHtml}
            ${ctaHtml}
            ${renderSignOff(brandConfig)}
            ${renderFooter(options.siteUrl, brandConfig)}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
