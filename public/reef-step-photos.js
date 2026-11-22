import {monoDropperPhoto} from './knot-photos.js';

const photos = '/assets/tackle/rig-photos/';
const illustration = 'AI-assisted club illustration.';
const source = (url, label) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
const swivelCredit = illustration + ' ' + source('https://www.wilsonfishing.com/Products/Terminal/Swivels-Rings-Clips/Swivels/Mustad-Barrel-3-Way-Cross-Swivel', 'See the real three-way swivel at Wilson Fishing') + '.';

export const reefStepPhotos = {
  paternoster: [
    {
      src: photos + 'paternoster-top.webp',
      alt: 'Reel line tied to the top eye of a three-way swivel. Its right and bottom eyes are empty.',
      caption: 'Start at the top eye. Leave the other two eyes free for the two traces.',
      credit: swivelCredit,
    },
    {
      src: photos + 'paternoster-drop.webp',
      alt: 'A long line runs straight from the bottom eye to the teardrop sinker. The side eye is still empty.',
      caption: 'The lighter 55 cm trace connects the bottom eye to the sinker.',
      credit: swivelCredit,
    },
    {
      src: photos + 'paternoster-complete.webp',
      alt: 'The short right branch ends at a circle hook with a squid strip. The longer lower branch carries the sinker.',
      caption: 'The 25 cm hook trace ties to the side eye. Check that the baited hook hangs clear of the sinker.',
      credit: swivelCredit,
    },
  ],
  emperor: [
    monoDropperPhoto,
    {
      src: photos + 'bottom-bomb-sinker.webp',
      alt: 'A pear-shaped lead sinker with one metal attachment eye at the narrow end.',
      caption: 'Attach the bottom of the leader at this eye, 70 to 100 cm below the hook branch.',
      credit: illustration,
    },
    {
      src: '/assets/tackle/baited-strip.webp',
      alt: 'Skin-on fish strip hanging from a single hook, with its narrow end trailing and the hook point showing.',
      caption: 'A tapered strip hangs from the tough end. Lower it beside the boat to check it stays straight.',
      credit: illustration,
    },
  ],
  live: [
    {
      src: '/assets/fish/yellowtail-scad.webp',
      alt: 'A yellowtail scad with a forked yellow tail, a large eye and a dark spot at the gill cover.',
      caption: 'One common baitfish is the yakka. Check the yellow tail and dark gill spot, then confirm the species and its rules.',
      credit: 'Photo by ' + source('https://www.inaturalist.org/observations/103464060', 'Lek Khauv') + ' · ' + source('https://creativecommons.org/licenses/by/4.0/', 'CC BY 4.0') + '. Cropped and converted to WebP.',
    },
    {
      src: photos + 'weighted-main-line.webp',
      alt: 'A round sinker slides on the blue reel line to the left of a barrel swivel. The clear hook trace joins the right eye.',
      caption: 'Weight on the reel side. The clear 80 cm trace on the other side leads to your circle hook.',
      credit: illustration,
    },
    {
      src: photos + 'lower-bait.webp',
      alt: 'An angler holds the rod over the gunwale while the line drops straight into the water beside the boat.',
      caption: 'Lower the bait beside the boat and control the line as it sinks to your chosen depth.',
      credit: illustration,
    },
  ],
  'squid-bait': [
    {
      src: photos + 'weighted-main-line.webp',
      alt: 'Reel line passes through a ball sinker before it reaches the first eye of a barrel swivel.',
      caption: 'Thread the ball sinker onto the reel line first. The swivel stops it from sliding down to the squid.',
      credit: illustration,
    },
    {
      src: '/assets/tackle/rig-steps/trace-circle.webp',
      alt: 'A clear trace connects the eye of a barrel swivel to the eye of a bare circle hook.',
      caption: 'Tie the free end of the trace to the hook eye. The trace is shortened in this picture so you can see both ends.',
      credit: illustration,
    },
    {
      src: photos + 'squid-head-on-circle.webp',
      alt: 'A small squid head hangs at the bottom of a circle hook with its tentacles trailing and the hook point clear.',
      caption: 'Pin the head once. The tentacles can move and the point and gap stay clear.',
      credit: illustration,
    },
  ],
  'reef-float': [
    {
      src: photos + 'running-step-2.webp',
      alt: 'A two-eyed barrel swivel with one line tied to each eye.',
      caption: 'Tie the main line to one eye and the clear trace to the other.',
      credit: illustration,
    },
    {
      src: photos + 'ball-above-hook-eye.webp',
      alt: 'A small ball sinker threaded onto the trace immediately above the hook eye.',
      caption: 'Slip the small sinker onto the trace before tying the hook. It can slide right down to the hook eye.',
      credit: illustration,
    },
    {
      src: photos + 'pilchard-on-circle.webp',
      alt: 'The skin of a small pilchard chunk sits on the bottom of a circle hook. The light ball sinker sits above it.',
      caption: 'Leave the hook point clear. Feed line so the lightly weighted pilchard drops with the current.',
      credit: illustration,
    },
  ],
};
