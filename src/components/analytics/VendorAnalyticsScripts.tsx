import Script from 'next/script'

interface Props {
  metaPixelId?:    string | null
  gtagId?:         string | null
  pixelId?:        string | null   // custom first-party pixel UUID
  tiktokPixelId?:  string | null
}

/** Safely encode a vendor-supplied string for inline JS: JSON-encode then escape </ to prevent </script> tag injection. */
function jsStr(value: string): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

function isValidMetaPixelId(id: string | undefined | null): boolean {
  if (!id) return false
  return /^\d{10,20}$/.test(id)
}

function isValidGtagId(id: string | undefined | null): boolean {
  if (!id) return false
  return /^G-[A-Z0-9]{10}$/i.test(id) || /^UA-\d{4,}-\d+$/i.test(id)
}

function isValidTikTokPixelId(id: string | undefined | null): boolean {
  if (!id) return false
  return /^[A-Za-z0-9]{10,}$/.test(id)
}

export default function VendorAnalyticsScripts({ metaPixelId, gtagId, pixelId, tiktokPixelId }: Props) {
  return (
    <>
      {/* ── Vendor Meta Pixel ──────────────────────────────────── */}
      {isValidMetaPixelId(metaPixelId) && (
        <Script
          id={`vendor-meta-pixel-${metaPixelId}`}
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
              __html: `
if(window.fbq){
  fbq('init',${jsStr(metaPixelId)});
  fbq('track','PageView');
}else{
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('set','agent','pl-nextjs');
  fbq('init',${jsStr(metaPixelId)});
  fbq('track','PageView');
}
`,
          }}
        />
      )}

      {/* ── Vendor Google Tag ──────────────────────────────────── */}
      {isValidGtagId(gtagId) && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gtagId)}`}
            strategy="afterInteractive"
          />
          <Script
            id={`vendor-gtag-${gtagId}`}
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('config',${jsStr(gtagId)},{send_page_view:false});
`,
            }}
          />
        </>
      )}

      {/* ── Vendor TikTok Pixel ────────────────────────────────── */}
      {isValidTikTokPixelId(tiktokPixelId) && (
        <Script
          id={`vendor-ttq-${tiktokPixelId}`}
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load(${jsStr(tiktokPixelId)});ttq.page();}(window,document,'ttq');
`,
          }}
        />
      )}

      {/* ── Custom first-party pixel — fires pageview via 1×1 GIF ─ */}
      {pixelId && (
        <Script
          id={`vendor-pixel-${pixelId}`}
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
(function(pid){
  var u=encodeURIComponent,loc=window.location;
  var src='/api/pixel/collect?pid='+pid+'&e=pageview&u='+u(loc.href)+'&r='+u(document.referrer||'');
  var img=new Image();img.src=src;
  window.__pixel=function(event,meta){
    fetch('/api/pixel/collect',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({pixelId:pid,event:event,url:loc.href,referrer:document.referrer,meta:meta||{}})});
  };
})(${jsStr(pixelId)});
`,
          }}
        />
      )}
    </>
  )
}
