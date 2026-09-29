// AdRenderer — generates real ad-network script tags for Adsterra and Monetag.
//
// Based on official ad-network integration patterns:
//
// Adsterra:
//   Banner:     <script>atOptions = {key, format:'iframe', height, width, params:{}};</script>
//               <script src="//{cdnUrl}/{zoneKey}/invoke.js"></script>
//   Native:     <script async data-cfasync="false" src="//{cdnUrl}/{zoneKey}/invoke.js"></script>
//   Popunder:   <script src="//{cdnUrl}/{zoneKey}/popunder.js"></script>
//   Social Bar:<script async src="//{cdnUrl}/{zoneKey}/social-bar.js"></script>
//   Direct Link:<a href="//{cdnUrl}/{zoneKey}/go.php?b={zoneId}">...</a>
//
// Monetag:
//   MultiTag:   <script src="//{cdnUrl}/{zoneId}/invoke.js" async data-cfasync="false"></script>
//   In-Page Push:<script src="//{cdnUrl}/{zoneId}/invoke.js" async data-cfasync="false"></script>
//   OnClick:    <script src="//{cdnUrl}/{zoneId}/invoke.js" async></script>
//   Push:       <script src="//{cdnUrl}/{zoneId}/invoke.js" async data-cfasync="false"></script>
//   Direct Link:<a href="//{cdnUrl}/{zoneId}/">...</a>
//   Vignette:   <script src="//{cdnUrl}/{zoneId}/invoke.js" async></script>
//
// The AdRenderer is a SERVER-SIDE library that returns the HTML snippet to inject.
// The client-side AdSlot component receives this snippet and injects it into the DOM.

export type AdTagConfig = {
  networkCode: string         // 'adsterra' | 'monetag' | 'platform'
  integrationType: string     // 'BANNER' | 'NATIVE' | 'DIRECT_LINK' | 'IN_PAGE' | etc.
  zoneKey: string | null      // ad-network zone key (alphanumeric)
  zoneId: string | null       // numeric zone ID (used in some URL patterns)
  cdnUrl: string | null       // CDN domain
  formatOptions: {
    width?: number
    height?: number
    format?: string           // 'iframe' | 'banner' | etc.
  } | null
}

export type RenderedAdTag = {
  // The HTML to inject into the ad slot container
  html: string
  // Human-readable description of what will be rendered
  description: string
  // Whether this is a script-based or link-based ad
  type: 'script' | 'link' | 'iframe'
  // The script src URL (if script-based) for preview/debug
  scriptSrc?: string
  // Whether this tag will actually load real ads (requires real cdnUrl + zoneKey)
  isLive: boolean
}

/**
 * Render the ad-network script tag for a given placement.
 *
 * Returns the HTML that the AdSlot component should inject into the DOM.
 * If cdnUrl or zoneKey are missing, returns a placeholder (not live).
 */
export function renderAdTag(config: AdTagConfig): RenderedAdTag {
  const { networkCode, integrationType, zoneKey, zoneId, cdnUrl, formatOptions } = config

  // If no CDN URL or zone key, return a placeholder — the admin hasn't configured real ad-network details yet
  if (!cdnUrl || (!zoneKey && !zoneId)) {
    return {
      html: '',
      description: 'No ad tag configured — admin must set CDN URL and zone key in the Platform ads tab',
      type: 'script',
      isLive: false,
    }
  }

  // Normalize CDN URL (remove protocol prefix if present)
  const cdn = cdnUrl.replace(/^https?:\/\//, '').replace(/^\/+/, '').replace(/\/+$/, '')
  // The zone identifier (prefer zoneKey, fall back to zoneId)
  const zone = zoneKey || zoneId || ''

  // Build the script src URL based on network + integration type
  switch (networkCode) {
    case 'adsterra':
      return renderAdsterraTag(integrationType, cdn, zone, zoneId, formatOptions)
    case 'monetag':
      return renderMonetagTag(integrationType, cdn, zone, zoneId, formatOptions)
    default:
      // Generic script-based tag for unknown networks
      return {
        html: `<script async data-cfasync="false" src="//${cdn}/${zone}/invoke.js"></script>`,
        description: `Generic ad tag: //${cdn}/${zone}/invoke.js`,
        type: 'script',
        scriptSrc: `//${cdn}/${zone}/invoke.js`,
        isLive: true,
      }
  }
}

function renderAdsterraTag(
  integrationType: string,
  cdn: string,
  zone: string,
  zoneId: string | null,
  formatOptions: AdTagConfig['formatOptions']
): RenderedAdTag {
  switch (integrationType) {
    case 'BANNER': {
      // Adsterra banner uses atOptions config + a separate invoke.js script
      const width = formatOptions?.width || 300
      const height = formatOptions?.height || 250
      const format = formatOptions?.format || 'iframe'
      return {
        html: `<script type="text/javascript">atOptions = {'key':'${zone}','format':'${format}','height':${height},'width':${width},'params':{}};</script><script type="text/javascript" src="//${cdn}/${zone}/invoke.js"></script>`,
        description: `Adsterra banner (${width}×${height} ${format}) — zone ${zone} on ${cdn}`,
        type: 'script',
        scriptSrc: `//${cdn}/${zone}/invoke.js`,
        isLive: true,
      }
    }
    case 'NATIVE': {
      return {
        html: `<script async="async" data-cfasync="false" src="//${cdn}/${zone}/invoke.js"></script>`,
        description: `Adsterra native banner — zone ${zone} on ${cdn}`,
        type: 'script',
        scriptSrc: `//${cdn}/${zone}/invoke.js`,
        isLive: true,
      }
    }
    case 'PUSH': {
      return {
        html: `<script async src="//${cdn}/${zone}/social-bar.js"></script>`,
        description: `Adsterra social bar / push — zone ${zone} on ${cdn}`,
        type: 'script',
        scriptSrc: `//${cdn}/${zone}/social-bar.js`,
        isLive: true,
      }
    }
    case 'DIRECT_LINK': {
      const b = zoneId || zone
      return {
        html: `<a href="//${cdn}/${zone}/go.php?b=${b}" target="_blank" rel="noopener noreferrer sponsored" style="display:block;width:100%;min-height:90px"></a>`,
        description: `Adsterra direct link — zone ${zone} on ${cdn}`,
        type: 'link',
        scriptSrc: `//${cdn}/${zone}/go.php?b=${b}`,
        isLive: true,
      }
    }
    case 'VIGNETTE':
    case 'IN_PAGE': {
      return {
        html: `<script type="text/javascript" src="//${cdn}/${zone}/${integrationType === 'VIGNETTE' ? 'vignette' : 'in-page'}.js"></script>`,
        description: `Adsterra ${integrationType.toLowerCase()} — zone ${zone} on ${cdn}`,
        type: 'script',
        scriptSrc: `//${cdn}/${zone}/invoke.js`,
        isLive: true,
      }
    }
    default: {
      return {
        html: `<script async data-cfasync="false" src="//${cdn}/${zone}/invoke.js"></script>`,
        description: `Adsterra ${integrationType.toLowerCase()} — zone ${zone} on ${cdn}`,
        type: 'script',
        scriptSrc: `//${cdn}/${zone}/invoke.js`,
        isLive: true,
      }
    }
  }
}

function renderMonetagTag(
  integrationType: string,
  cdn: string,
  zone: string,
  zoneId: string | null,
  _formatOptions: AdTagConfig['formatOptions']
): RenderedAdTag {
  // Monetag uses a unified invoke.js pattern for most ad types
  switch (integrationType) {
    case 'MULTITAG':
    case 'IN_PAGE':
    case 'PUSH':
    case 'VIGNETTE':
    case 'NATIVE':
    case 'BANNER': {
      return {
        html: `<script src="//${cdn}/${zone}/invoke.js" async="async" data-cfasync="false"></script>`,
        description: `Monetag ${integrationType.toLowerCase().replace('_', ' ')} — zone ${zone} on ${cdn}`,
        type: 'script',
        scriptSrc: `//${cdn}/${zone}/invoke.js`,
        isLive: true,
      }
    }
    case 'DIRECT_LINK': {
      return {
        html: `<a href="//${cdn}/${zone}/" target="_blank" rel="noopener noreferrer sponsored" style="display:block;width:100%;min-height:90px"></a>`,
        description: `Monetag direct link — zone ${zone} on ${cdn}`,
        type: 'link',
        scriptSrc: `//${cdn}/${zone}/`,
        isLive: true,
      }
    }
    default: {
      return {
        html: `<script src="//${cdn}/${zone}/invoke.js" async="async" data-cfasync="false"></script>`,
        description: `Monetag ${integrationType.toLowerCase()} — zone ${zone} on ${cdn}`,
        type: 'script',
        scriptSrc: `//${cdn}/${zone}/invoke.js`,
        isLive: true,
      }
    }
  }
}

/**
 * Generate a preview HTML snippet for the admin to see what the ad tag looks like.
 * This is the raw HTML that would be injected — admins can inspect it before verifying.
 */
export function previewAdTagHtml(config: AdTagConfig): string {
  const tag = renderAdTag(config)
  if (!tag.html) {
    return '<!-- No ad tag configured — set CDN URL and zone key first -->'
  }
  return tag.html
}
