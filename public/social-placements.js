// Each placement is a separate creative export. These are production presets,
// not universal upload requirements. Recheck each ad destination before buying media.
// Organic resolution presets are convenient export sizes, not mandatory sizes.
// Sources: Meta Ads Guide, Google Ads Help, TikTok Ads Manager, and the linked
// Straddie Noticeboard Network pilot's web/tv/kiosk outlet definitions.
export const PUBLISHING_DESTINATIONS = Object.freeze([
  {id:'facebook',label:'Facebook',status:'existing'},
  {id:'instagram',label:'Instagram',status:'existing'},
  {id:'youtube',label:'YouTube',status:'existing'},
  {id:'tiktok',label:'TikTok',status:'existing'},
  {id:'noticeboard',label:'Straddie Noticeboard Network',status:'proposed'}
]);

export const CREATIVE_PRESETS = Object.freeze([
  {id:'facebook-feed',platform:'facebook',placement:'Feed',distribution:'organic',kind:'both',
    width:1080,height:1350,ratio:'4:5',note:'Common portrait production preset, not a Facebook Feed requirement.'},
  {id:'facebook-reels',platform:'facebook',placement:'Reels / Stories',distribution:'organic',kind:'video',
    width:1080,height:1920,ratio:'9:16',note:'Full-screen vertical; check captions and interface-safe areas.'},
  {id:'facebook-feed-ad',platform:'facebook',placement:'Feed image/video ad',distribution:'paid',kind:'both',
    width:1440,height:1800,ratio:'4:5',note:'Meta Ads Guide 4:5 creative recommendation; placement and campaign requirements can vary.'},
  {id:'facebook-reels-ad',platform:'facebook',placement:'Reels / Stories ad',distribution:'paid',kind:'video',
    width:1440,height:2560,ratio:'9:16',note:'Meta full-screen ads; create separate caption and safe-area layout.'},

  {id:'instagram-feed',platform:'instagram',placement:'Feed',distribution:'organic',kind:'both',
    width:1080,height:1350,ratio:'4:5',note:'Common portrait feed production preset, not an advertising-only size.'},
  {id:'instagram-reels',platform:'instagram',placement:'Reels / Stories',distribution:'organic',kind:'video',
    width:1080,height:1920,ratio:'9:16',note:'Full-screen vertical video; check text safe areas.'},
  {id:'instagram-feed-ad',platform:'instagram',placement:'Feed image/video ad',distribution:'paid',kind:'both',
    width:1440,height:1800,ratio:'4:5',note:'4:5 Meta Feed ad production preset; verify placement-specific requirements.'},
  {id:'instagram-reels-ad',platform:'instagram',placement:'Reels / Stories ad',distribution:'paid',kind:'video',
    width:1440,height:2560,ratio:'9:16',note:'9:16 Meta ads production preset; verify safe areas.'},

  {id:'youtube-shorts',platform:'youtube',placement:'Shorts',distribution:'organic',kind:'video',
    width:1080,height:1920,ratio:'9:16',note:'Vertical original video. The 30-second roundup is suitable.'},
  {id:'youtube-standard',platform:'youtube',placement:'Standard watch page',distribution:'organic',kind:'video',
    width:1920,height:1080,ratio:'16:9',note:'Separate landscape re-edit, not a blind crop of a vertical film.'},
  {id:'youtube-shorts-ad',platform:'youtube',placement:'Shorts video ad',distribution:'paid',kind:'video',
    width:1080,height:1920,ratio:'9:16',note:'Google Ads Shorts format; objective, CTA and length vary by campaign.'},
  {id:'youtube-instream-ad',platform:'youtube',placement:'In-stream video ad',distribution:'paid',kind:'video',
    width:1920,height:1080,ratio:'16:9',note:'Google Ads landscape video format; length depends on the ad product.'},

  {id:'tiktok-feed',platform:'tiktok',placement:'Organic vertical video',distribution:'organic',kind:'video',
    width:1080,height:1920,ratio:'9:16',note:'Vertical video with on-screen captions.'},
  {id:'tiktok-infeed-ad',platform:'tiktok',placement:'Auction in-feed video ad',distribution:'paid',kind:'video',
    width:1080,height:1920,ratio:'9:16',note:'Recommended vertical orientation; official Non-Spark minimum is 540×960.'},

  {id:'noticeboard-web',platform:'noticeboard',placement:'Web/mobile notice',distribution:'organic',kind:'poster',
    width:1200,height:630,ratio:'responsive',provisional:true,note:'Provisional still-image source; web cards are responsive and do not specify a fixed image resolution.'},
  {id:'noticeboard-tv',platform:'noticeboard',placement:'Venue TV / onboard screen',distribution:'organic',kind:'poster',
    width:1920,height:1080,ratio:'16:9',provisional:true,note:'Proposed still-image design for landscape noticeboard display; no live video publishing.'},
  {id:'noticeboard-kiosk',platform:'noticeboard',placement:'Portrait touchscreen kiosk',distribution:'organic',kind:'poster',
    width:1080,height:1920,ratio:'9:16',provisional:true,note:'Proposed still-image design for portrait noticeboard display; no live video publishing.'},
  {id:'noticeboard-web-ad',platform:'noticeboard',placement:'Sponsored web notice',distribution:'paid',kind:'poster',
    width:1200,height:630,ratio:'responsive',provisional:true,note:'Future paid placement only; requires local pricing, disclosure, inventory and editorial approval.'},
  {id:'noticeboard-tv-ad',platform:'noticeboard',placement:'Sponsored landscape display notice',distribution:'paid',kind:'poster',
    width:1920,height:1080,ratio:'16:9',provisional:true,note:'Future paid still display only; no booked slots or video ad service.'},
  {id:'noticeboard-kiosk-ad',platform:'noticeboard',placement:'Sponsored touchscreen notice',distribution:'paid',kind:'poster',
    width:1080,height:1920,ratio:'9:16',provisional:true,note:'Future sponsored kiosk still; subject to host and editorial rules.'}
]);

export const placementSources=Object.freeze({
  meta:'https://www.facebook.com/business/ads-guide',
  youtube:'https://support.google.com/google-ads/answer/13547298?hl=en',
  tiktok:'https://ads.tiktok.com/resources/help/article/tiktok-auction-in-feed-ads?lang=en-GB',
  noticeboard:'https://github.com/auraofintelligence/straddie-noticeboard-cloudflare'
});

const isVideo = post=>Number(post.durationSeconds)>0;
// No automatic ad purchases, paid platform targeting, or noticeboard submissions.
export function creativeVariantsFor(post,delivery){
  const video=isVideo(post);
  const organic=delivery?.organic||['facebook','instagram','youtube','tiktok','noticeboard'];
  const paid=delivery?.paid||[];
  const includePaid=Boolean(delivery?.paidPlanning);
  return CREATIVE_PRESETS.filter(preset=>
    (preset.distribution==='organic'?organic.includes(preset.platform):includePaid&&paid.includes(preset.platform)) &&
    (preset.kind==='poster'||preset.kind==='both'||video)
  ).map(preset=>({
    id:preset.id,platform:preset.platform,placement:preset.placement,distribution:preset.distribution,
    width:preset.width,height:preset.height,ratio:preset.ratio,size:preset.width+' × '+preset.height,
    asset:preset.kind==='poster'?'Still-image adaptation':video?'Video':'Image',
    status:preset.distribution==='paid'?'Unapproved paid creative':'Organic creative suggestion',
    provisional:Boolean(preset.provisional),note:preset.note
  }));
}
