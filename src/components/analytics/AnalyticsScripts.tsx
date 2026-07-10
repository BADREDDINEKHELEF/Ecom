import Script from 'next/script'

const PIXEL_ID   = process.env.NEXT_PUBLIC_META_PIXEL_ID
const GTAG_ID    = process.env.NEXT_PUBLIC_GTAG_ID
const TIKTOK_ID  = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID

function isValidMetaPixelId(id: string | undefined): boolean {
  if (!id) return false
  return /^\d{10,20}$/.test(id)
}

function isValidGtagId(id: string | undefined): boolean {
  if (!id) return false
  return /^G-[A-Z0-9]{10}$/i.test(id) || /^UA-\d{4,}-\d+$/i.test(id)
}

function isValidTikTokPixelId(id: string | undefined): boolean {
  if (!id) return false
  return /^[A-Za-z0-9]{10,}$/.test(id)
}

export default function AnalyticsScripts() {
  return (
    <>
      {/* ── Meta Pixel ─────────────────────────────────────────── */}
      {isValidMetaPixelId(PIXEL_ID) && (
        <>
          <Script
            id="meta-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
const pid = ${JSON.stringify(PIXEL_ID)};
fbq('set','agent','pl-nextjs',pid);
window.__fb_pixels = window.__fb_pixels || {};
if (!window.__fb_pixels[pid]) {
  fbq('init',pid);
  fbq('track','PageView');
  window.__fb_pixels[pid] = true;
}
`,
            }}
          />
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {/* ── Google Tag (gtag.js / GA4 / Google Ads) ────────────── */}
      {isValidGtagId(GTAG_ID) && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`}
            strategy="afterInteractive"
          />
          <Script
            id="gtag-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('config',${JSON.stringify(GTAG_ID)},{send_page_view:false});
`,
            }}
          />
        </>
      )}
      {/* ── TikTok Pixel ───────────────────────────────────────── */}
      {isValidTikTokPixelId(TIKTOK_ID) && (
        <Script
          id="tiktok-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load(${JSON.stringify(TIKTOK_ID)});}(window,document,'ttq');
`,
          }}
        />
      )}
    </>
  )
}
