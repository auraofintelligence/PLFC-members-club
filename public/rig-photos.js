import {monoDropperPhoto} from './knot-photos.js';

const tackle = '/assets/tackle/';
const photos = tackle + 'rig-photos/';
const link = (url, text) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
const commons = (file, author) => link('https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file.replaceAll(' ', '_')), author);
const shareAlike = link('https://creativecommons.org/licenses/by-sa/4.0/', 'CC BY-SA 4.0');
const club = 'Club illustration.';
const generated = 'AI-assisted club illustration.';

const references = {
  running: {
    src: photos + 'running-sinker-parts.webp', size: [1200,400],
    alt: 'Three enlarged views of the line through a ball sinker, a barrel swivel tied at both ends and a single hook with worm bait.',
    caption: 'The sinker slides on the main line. The swivel joins the trace, and the baited hook sits at the end.',
    credit: generated
  },
  prawn: {
    src: tackle + 'baited-prawn.webp', size: [440,440],
    alt: 'A small piece of bait prawn on a single hook with its point clear.',
    caption: 'Match a small piece of prawn to the hook bend and keep the point clear.',
    credit: club
  },
  pipi: {
    src: tackle + 'baited-pipi.webp', size: [440,440],
    alt: 'A piece of pipi flesh on a baitholder hook with the hook point exposed.',
    caption: 'Thread on just enough pipi to hold together while leaving space inside the bend.',
    credit: club
  },
  paternoster: {
    src: photos + 'three-way-cross-swivel.webp', size: [900,600],
    alt: 'A three-way barrel swivel with a wire eye above, another below and a third pointing right.',
    caption: 'Tie the reel line to the top eye, the hook trace to the side eye and the sinker trace to the bottom eye.',
    credit: generated + ' ' + link('https://www.wilsonfishing.com/Products/Terminal/Swivels-Rings-Clips/Swivels/Mustad-Barrel-3-Way-Cross-Swivel', 'See a real three-way swivel at Wilson Fishing') + '.'
  },
  float: {
    src: photos + 'stick-float.webp', size: [416,730],
    alt: 'A slender stick float with a bright red tip and a long, narrow stem below its body.',
    caption: 'The bright tip is the part you watch above the water.',
    credit: 'Stick float photo by ' + commons('Feather Inlaid River Stick.jpg','Roy Sell') + ' · ' + shareAlike + '. Resized and converted to WebP.'
  },
  'dropper-loop': {...monoDropperPhoto, size: [960,540]},
  plastic: {
    src: photos + 'paddle-tail.webp', size: [900,422],
    alt: 'Bare jighead with its weighted nose and hook on the left. On the right a fitted paddle-tail lure sits against the weight with the hook point above the back.',
    caption: 'Compare the bare jighead with the finished lure. The tail hangs free and the hook point shows above the back.',
    credit: 'Bare jighead photo by ' + commons('Jig-Twister lure 2009 G2.jpg', 'George Chernilevsky') + ', public domain. Cropped and paired with a club illustration.'
  },
  gang: {
    src: tackle + 'baited-pilchard.webp', size: [600,300],
    alt: 'Side-by-side views of a whole pilchard and a set of three linked hooks.',
    caption: 'Hold the linked hooks beside your pilchard to check their spacing before threading the bait.',
    credit: club
  },
  'bait-jig': {
    src: photos + 'sabiki-dressing.webp', size: [850,567],
    alt: 'A single small gold hook dressed with shiny strands. Its short branch line leaves the hook eye.',
    caption: 'One dressed hook from a bait jig, enlarged. Each hook sits on its own short branch.',
    credit: generated
  },
  squid: {
    src: '/assets/bait/bay/squid-jig.webp', size: [848,348],
    alt: 'A handmade squid jig viewed from the side, with a weight under the nose and a crown of fine points at the tail.',
    caption: 'Spot the little keel below the head and the crown of points at the tail.',
    credit: 'Photo by ' + commons('Worlds first hand made leather squid jigs.jpg', 'RoccoTorezz') + ' · ' + shareAlike + '. Cropped and converted to WebP.'
  },
  metal: {
    src: photos + 'spoons.webp', size: [685,329],
    alt: 'Two metal casting spoons, one with a blue finish and one silver. Each has a line eye at the narrow end and a hook at the tail.',
    caption: 'The leader goes to the front eye of the spoon. The hook travels behind the metal body.',
    credit: 'Metal spoon photo by ' + commons('Spoon-bait 2008 G1.jpg', 'George Chernilevsky') + ', public domain. Cropped and converted to WebP.'
  },
  live: {
    src: photos + 'circle-hook.webp', size: [300,277],
    alt: 'Close-up of a single circle hook. The short curved tip points back towards its long shank.',
    caption: 'Recognise a circle hook by its inward-facing point. Leave the space inside the bend clear when presenting the bait.',
    credit: 'Hook photo by ' + commons('Circle-hook.jpg', 'Jens Kraglund') + ', public domain. Converted to WebP.'
  },
  'reef-float': {
    src: photos + 'reef-bait.webp', size: [850,567],
    alt: 'Separate pieces of tackle for a drifting reef bait. A small round sinker, a circle hook and a skin-on piece of fish.',
    caption: 'Use a piece of pilchard small enough to leave the hook gap clear. A light sinker lets it drift as it descends.',
    credit: generated
  },
  'fish-strip': {
    src: tackle + 'baited-strip.webp', size: [440,440],
    alt: 'A narrow tapered strip of fish hangs from a single hook with the point showing.',
    caption: 'Hook the thicker end and leave the thin end trailing. Keep the point and gap clear.',
    credit: club
  },
  'squid-bait': {
    src: tackle + 'baited-squid.webp', size: [600,300],
    alt: 'A small whole squid alongside a circle hook with its point turned towards the shank.',
    caption: 'Compare your squid bait with the hook. A strip cut to fit helps keep the gap clear.',
    credit: club
  }
};

export function rigPhotoHtml(key) {
  const photo = references[key];
  if (!photo) return '';
  const [width,height] = photo.size;
  return `<figure class="rig-reference-photo"><img src="${photo.src}" width="${width}" height="${height}" alt="${photo.alt}" loading="lazy" decoding="async"><figcaption>${photo.caption}<br><small>${photo.credit}</small></figcaption></figure>`;
}
