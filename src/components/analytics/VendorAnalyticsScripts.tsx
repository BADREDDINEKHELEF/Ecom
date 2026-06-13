import Script from 'next/script'

interface Props {
  metaPixelId?: string | null
  gtagId?:      string | null
  pixelId?:     string | null   // custom first-party pixel UUID
}

export default function VendorAnalyticsScripts({ metaPixelId, gtagId, pixelId }: Props) {
  return (
    <>
      {/* ── Vendor Meta Pixel ──────────────────────────────────── */}
      {metaPixelId && (
        <Script
          id={`vendor-meta-pixel-${metaPixelId}`}
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${metaPixelId}');
fbq('track','PageView');
`,
          }}
        />
      )}

      {/* ── Vendor Google Tag ──────────────────────────────────── */}
      {gtagId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`}
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
gtag('config','${gtagId}');
`,
            }}
          />
        </>
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
})('${pixelId}');
`,
          }}
        />
      )}
    </>
  )
}
