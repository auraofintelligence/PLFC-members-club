import { HEAVY_RIGS } from './heavy-fish-rigs.js';

const fraserSurf = { label: 'Justin Willmer’s surf rigs', url: 'https://fishingmonthly.com.au/fishing-fraser-island/' };

export const FISH_RIGS = {
  'sand-whiting': {
    name: 'Beach worm on a running sinker',
    trace: '30 to 50 cm of 8 to 10 lb mono (about 3.6 to 4.5 kg)',
    hook: 'Size 4 long-shank worm hook',
    presentation: 'Slide a piece of marine worm up the long shank. Leave a short tail and enough hook point showing for the fish to take it.',
    adjust: 'In a shallow gutter with little sweep, use a small ball sinker. Add weight only if the bait drifts away too quickly.',
    image: 'baited-worm', imageAlt: 'A marine worm threaded along a long-shank hook with the point exposed.',
    sources: [fraserSurf, { label: 'Alvey beach fishing tips', url: 'https://tackleland.com.au/beach-fishing-tips-alvey-reels-australia/' }],
  },
  'yellowfin-bream': {
    name: 'Bait prawn for an estuary edge',
    trace: '45 cm of 6 lb leader (about 2.7 kg) as a light starting point',
    hook: 'Size 1 baitholder hook',
    presentation: 'Thread a small piece of Australian wild-caught bait prawn onto the hook. Leave space between the point and the shank.',
    adjust: 'In gentle current, use the smallest ball sinker that lets the prawn settle. If the bottom is rough, check the trace for nicks.',
    image: 'baited-prawn', imageAlt: 'Bait prawn flesh on a single hook with the point clear.',
    sources: [{ label: 'Sami Omari’s estuary bream rig', url: 'https://fishingworld.com.au/how-to/bream-rigs/' },
      { label: 'NSW Fisheries bream tackle guide (PDF)', url: 'https://www.dpi.nsw.gov.au/__data/assets/pdf_file/0003/1254396/16385-Gofishing_TurossWeb-2024.pdf' }],
  },
  'dusky-flathead': {
    name: 'A moving fish strip along the sand',
    trace: '30 to 50 cm of 10 to 20 lb mono (about 4.5 to 9 kg)',
    hook: '2/0 circle hook for a small strip. Match the hook to the bait.',
    presentation: 'Pierce the thicker end of a tapered fish strip once. Leave the narrow end free to flutter and keep the inside curve of the hook clear.',
    adjust: 'Use less weight in shallow, slow water. In a deeper channel, add enough to reach the sand. Let a circle hook come tight with steady pressure.',
    image: 'baited-strip', imageAlt: 'A narrow fish strip hangs from one end on a circle hook.',
    sources: [{ label: 'Daiwa Australia flathead bait rigs', url: 'https://daiwafishing.com.au/blogs/news/how-to-catch-flathead-on-bait-flathead-series' }],
  },
  'swallowtail-dart': {
    name: 'Pipi bait for a surf gutter',
    trace: '40 to 50 cm of 15 lb mono (about 6.8 kg) for a larger surf gutter',
    hook: 'Size 4 long baitholder hook',
    presentation: 'Pin a small piece of pipi flesh onto the hook. Leave its point clear. Buy your bait or check where collecting pipis is allowed.',
    adjust: 'Let the bait move slowly along the gutter. A stronger sweep may need more sinker weight. Work only from a dry, safe spot.',
    image: 'baited-pipi', imageAlt: 'A small piece of shellfish flesh on a single hook with the point showing.',
    sources: [fraserSurf, { label: 'Alvey’s dart hook advice', url: 'https://tackleland.com.au/beach-fishing-tips-alvey-reels-australia/' }],
  },
  ...HEAVY_RIGS,
};
