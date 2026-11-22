// Example starting setups for line fishing. Source links explain the component choices.
const coffs = {
  label: 'NSW Fisheries Coffs Coast fishing guide',
  url: 'https://www.dpi.nsw.gov.au/__data/assets/pdf_file/0010/1276660/16610-GoFishingGuide_CoffsCoastWeb-2024.pdf',
};
const beach = {
  label: 'Compleat Angler beach fishing guide',
  url: 'https://compleatanglernedlands.com.au/blogs/fishing-guides/beach-fishing-guide',
};

export const HEAVY_RIGS = {
  tailor: {
    name: 'Whole pilchard on linked hooks',
    trace: 'Start with 1 m of 40 lb (18 kg) mono between the swivel and the hooks.',
    hook: 'Three linked 4/0 hooks, often sold as a gang. Lay them against an average pilchard to check the fit.',
    presentation: 'Lay the hooks along one side of a whole pilchard. Pin the hooks through in turn so the bait stays straight and the points show. Wind it slowly through the gutter.',
    adjust: 'In quiet water try the bait unweighted. Add a little weight if it sweeps away. Check the last stretch of line for tooth damage after each fish.',
    image: 'baited-pilchard', imageAlt: 'A whole pilchard beside a set of linked hooks.', imageNote: 'Bait and hooks shown separately.',
    sources: [
      { label: 'Surf Casting and Angling Club of WA tailor notes', url: 'https://www.scac.net.au/TailorFishingInstructionPeriodNovember2011.pdf' },
      beach,
    ],
  },
  snapper: {
    name: 'Drifting a pilchard piece',
    trace: 'Try 1.2 m of clear 12 kg (26 lb) mono below a swivel, with a small running ball sinker above the hook.',
    hook: 'One 4/0 inline circle hook. The point curves back towards the shank and sits in the same plane.',
    presentation: 'Cut a small chunk of pilchard. Pin it once through the skin with the point and the gap in the hook clear. Let the bait sink naturally in the current.',
    adjust: 'Add just enough weight for the bait to reach the fish. Reduce the bait size if it fills the hook. On a steady bite, wind until the line comes tight.',
    image: 'baited-chunk', imageAlt: 'Pilchard bait alongside a circle hook.', imageNote: 'Bait and hook shown separately.',
    sources: [
      coffs,
      { label: 'Tackle Tactics snapper bait and rig notes', url: 'https://www.tackletactics.com.au/blogs/learn-to-fish/southern-snapper-on-bait' },
    ],
  },
  'spanish-mackerel': {
    name: 'Trolling a diving minnow',
    trace: 'Use about 2 m of 80 lb (36 kg) mono leader. Join it by swivel to 30 cm of 44 lb (20 kg) single-strand bite wire just ahead of the lure.',
    hook: 'On the 160 mm Laser Pro example, use the supplied size 2 heavy-duty trebles. Other lures come with different fittings.',
    presentation: 'Connect the wire to the lure’s nose. Ease the minnow alongside the moving boat and check it swims straight, then let it out behind you.',
    adjust: 'A diving lure needs a clear path above the reef. Match the bib depth and boat speed to the water. Replace kinked wire before putting the lure out again.',
    image: 'wired-minnow', imageAlt: 'An illustrated diving minnow with a nose attachment and two treble hooks.', imageNote: 'Example lure shape. Check the fittings supplied with your lure.',
    sources: [
      { label: 'Fishing World east-coast mackerel rigs', url: 'https://fishingworld.com.au/how-to/how-to-catch-mackerel-along-australias-east-coast/' },
      { label: 'Shimano Australia trolling leader example', url: 'https://fish.shimano.com/en-AU/content/c/Articles/how-to/spanish-on-the-hunt.html' },
      { label: 'Halco 160 mm diving minnow specifications', url: 'https://halcotackle.com/products/laser-pro-160' },
    ],
  },
  mulloway: {
    name: 'Squid bait on a running sinker',
    trace: 'Start with 1 m of 50 lb (23 kg) mono from the swivel to the hook. The sinker runs on the line above the swivel.',
    hook: 'One 8/0 circle hook for a fresh squid head. Choose a bait small enough to leave a clear gap beside the point.',
    presentation: 'Pin the hook once through firm flesh at the top of the squid head. Let the tentacles hang free. Place the bait in the deeper part of a reachable gutter.',
    adjust: 'Use the lightest sinker that keeps the bait in place. When the fish takes line steadily, wind gently to bring the circle hook home.',
    image: 'baited-squid', imageAlt: 'A whole squid and a separate circle hook.', imageNote: 'Bait and hook shown separately. The squid head is the part used below.',
    sources: [
      { label: 'Compleat Angler mulloway baits and traces', url: 'https://compleatanglernedlands.com.au/blogs/fishing-guides/the-complete-guide-to-mulloway-fishing-in-perth-land-based-tips-spots-gear' },
      beach,
    ],
  },
};
