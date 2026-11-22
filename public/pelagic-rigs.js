import {HEAVY_RIGS} from './heavy-fish-rigs.js';

const mackerel = HEAVY_RIGS['spanish-mackerel'];

export const pelagicRigs = {
  troll: {
    title: 'Diving minnow for Spanish mackerel',
    where: 'From a moving boat in open coastal water. Check the southern Spanish mackerel season before choosing this target.',
    kit: 'A saltwater trolling outfit, a diving minnow, mono leader, swivel, short wire bite trace and pliers.',
    trace: mackerel.trace,
    hook: mackerel.hook,
    bait: 'The hard lure is the bait. Its projecting lip, called a bib, makes it dive and wobble as the boat moves.',
    adjust: mackerel.adjust,
    steps: [
      ['Add a short bite trace', 'Join the heavy mono leader to the swivel on a prepared wire trace. Wire protects the last stretch from sharp teeth.'],
      ['Connect the minnow', 'Attach the free end of the wire trace to the lure’s tow point. Check that both hooks hang freely and the fittings are closed.'],
      ['Check the swim', 'With the skipper watching the water ahead, test the lure beside the boat. When it tracks straight, let it run astern within the speed and depth range marked on its packet.']
    ],
    sources: [
      ...mackerel.sources.map(({label,url}) => [label,url]),
      ['Queensland seasonal closures', 'https://www.dpi.qld.gov.au/services/fisheries/closures/tidal-seasons']
    ],
    targets: ['spanish-mackerel'],
    photo: 'troll'
  },
  bayDiver: {
    title: 'Trolled hardbody for bay mackerel or tuna',
    where: 'For school and spotted mackerel in Moreton Bay. Inshore anglers also troll diving minnows for longtail and mackerel tuna when the fish are below the surface.',
    kit: 'A trolling or spin outfit, a clear mono leader and a bibbed hard lure. A local school mackerel example uses 8 kg main line.',
    trace: 'A Moreton Bay school mackerel setup uses 2 m of 20 kg mono tied to the lure with a loop knot. For inshore tuna, one Queensland angler uses about 2 m of 30 to 40 lb (14 to 18 kg) mono or fluorocarbon.',
    hook: 'Use the trebles supplied for your lure. As a size guide, the Predatek Sandviper Xtra has two 2/0 hooks. Its standard model has three size 2 hooks.',
    bait: 'Use the whole hard lure. A shallow diver runs nearer the surface. Choose a deeper model when the baitfish are well below the boat.',
    adjust: 'Teeth can cut a mono leader. Check it after each contact. If it is getting bitten through, use the wired Spanish mackerel setup or change your approach.',
    steps: [
      ['Choose the running depth', 'Look at the depth printed on the lure packet. Leave clearance above the bottom.'],
      ['Give the lure room to swim', 'Tie the leader at the tow point using the connection its maker recommends. Check that the rings close and the hooks swing clear.'],
      ['Test alongside, then troll', 'Ease the minnow into the water as the boat moves. Look for a straight, steady wobble. Troll alongside the edge of the bait school at a speed the lure can hold.']
    ],
    sources: [
      ['How a Moreton Bay angler trolls for school mackerel', 'https://bnbfishing.com.au/school-mackerel-tactics/'],
      ['Nige Webster on trolling hardbodies for mackerel', 'https://www.bcf.com.au/be-a-bcfing-expert/fishing/buyers-guide/mackerel-trolling-tips.html'],
      ['Queensland inshore tuna and mackerel trolling', 'https://fishingmonthly.com.au/trolling-for-inshore-pelagics-with-hardbodies/'],
      ['Compare two Sandviper hook arrangements', 'https://www.predatek.com/s150x-sandviper']
    ],
    targets: ['school-mackerel','spotted-mackerel','longtail-tuna','mackerel-tuna'],
    photo: 'bayDiver'
  },
  topwater: {
    title: 'Surface stickbait for tuna or golden trevally',
    where: 'Cast to longtail tuna feeding near the surface in Moreton Bay. Golden trevally will also rise to surface lures when feeding up high. Leave room for birds and other boats.',
    kit: 'A spinning outfit rated to cast your lure. One heavier Moreton Bay tuna setup uses 40 to 50 lb braid and a 100 to 140 mm stickbait. For golden trevally in open water, 10 to 15 kg main line is a lighter option.',
    trace: 'An example for a 43 g stickbait is about 2 m of 50 lb (23 kg) leader between the braid and lure.',
    hook: 'Strong saltwater inline singles or trebles matched to the lure. For the 140 mm Maria Loaded F140, the maker specifies 1/0 trebles or single hooks weighing 2.5 to 4 g each.',
    bait: 'A floating stickbait has a slender body and no diving bib. Short twitches make it dart like a baitfish.',
    adjust: 'If tuna pass the lure while feeding on tiny baitfish, try a smaller offering. Check the hook weights when changing hooks so the lure still floats and swims properly.',
    steps: [
      ['Match the lure to the outfit', 'Check the rod’s casting weight and attach the leader to the braid. Choose a stickbait close to the size of the baitfish you see.'],
      ['Check the hooks and tow point', 'Fit the hooks recommended for the model and connect your leader at the nose. Test the action in clear water beside the boat.'],
      ['Cast clear of the school', 'Work from outside the feeding fish with the boat out of their path. Cast ahead of them, then try two short twitches, a pause and a few turns of the reel.']
    ],
    sources: [
      ['Moreton Bay longtail tackle and lure sizes', 'https://fishingmonthly.com.au/casting-for-moreton-bay-longtail-tuna/'],
      ['Longtail spinning leader example', 'https://fishingmonthly.com.au/gonna-land-me-a-longtail/'],
      ['A local angler’s stickbait retrieve', 'https://bnbfishing.com.au/tips-moreton-bay-longtail-tuna/'],
      ['Floating stickbait photo and hook guide', 'https://www.yamaria.co.jp/english/maria/product/detail/37'],
      ['Recfishwest on surface lures for golden trevally', 'https://recfishwest.org.au/news/scott-species-golden-trevally-hard-fighting-and-determined-beasts/']
    ],
    targets: ['longtail-tuna','golden-trevally'],
    photo: 'topwater'
  },
  vertical: {
    title: 'Deep metal jig for kingfish and amberjack',
    where: 'For an experienced crew drifting offshore. Both fish are recorded on jigs off Cape Moreton. Check marine park boundaries before starting a drift.',
    kit: 'A dedicated jigging rod, braid, heavy mono leader, solid ring, split ring, assist hook and long metal speed jig within the rod’s weight range.',
    trace: 'For heavy reef fishing, Brisbane angler Jim Potts uses 60 lb braid with 4 to 5 m of 100 to 150 lb mono leader. This is his offshore setup.',
    hook: 'A strong single assist hook on a short braided cord at the head of the jig. Match the hook to the width of the jig so the point clears the body.',
    bait: 'The weighted metal body is the lure. It moves up through the water as you lift the rod and wind.',
    adjust: 'Choose enough weight to stay close to vertical within the rod rating. If the current sweeps the line away, reset the drift or change plans. Have a release weight ready for deep-caught reef fish.',
    steps: [
      ['Join the leader to the solid ring', 'The solid ring has no gap. Tie your leader to it and fit the assist hook to that ring. This keeps the hook connected directly to the leader.'],
      ['Clip on the jig with split-ring pliers', 'Use the split ring, which opens like a key ring, to join the top eye of the jig to the solid ring. Check the assist hook can swing clear.'],
      ['Work vertically through the fish', 'Watch the drift first. Lower the jig to the depth shown on the sounder, then work it upwards with repeated lifts and turns of the reel. Reset when the line angles well away from the boat.']
    ],
    sources: [
      ['Cape Moreton jigging with Jim Potts (PDF)', 'https://team.doclures.com/wp-content/uploads/2021/04/E358-deep-jigging-101-jim-potts.pdf'],
      ['Daiwa Australia kingfish jigging guide', 'https://daiwafishing.com.au/blogs/news/how-to-catch-kingfish-beginners-guide'],
      ['An offshore Moreton Island jigging account', 'https://fishandboat.com.au/a-lesson-in-bluewater-jigging/'],
      ['Queensland reef fish release advice', 'https://www.qld.gov.au/recreation/activities/boating-fishing/rec-fishing/responsible-fishing']
    ],
    targets: ['yellowtail-kingfish','amberjack'],
    photo: 'vertical'
  }
};

const pictures = {
  troll: ['wired-minnow', 'A diving minnow with a projecting lip at the head and treble hooks below.', 'The projecting bib makes the minnow dive.'],
  bayDiver: ['trolling-lure', 'A bibbed diving minnow with its tow eye on the clear lip and two treble hooks.', 'Connect to the tow eye on this style of diving minnow.'],
  topwater: ['surface-stickbait', 'A streamlined bibless stickbait with a hook under the belly and another at the tail.', 'The nose has a tow point and no diving bib.'],
  vertical: ['vertical-assist-jig', 'A slim metal jig with a single assist hook on a short cord at its head.', 'The hook hangs on a short cord at the head of the jig.']
};

export function pelagicPhotoHtml(key) {
  if (!Object.hasOwn(pictures, key)) return '';
  const [image,alt,caption] = pictures[key];
  return `<figure class="pelagic-lure-photo" style="margin:0"><img src="/assets/tackle/${image}.webp" alt="${alt}" width="800" height="315" loading="lazy" decoding="async" style="display:block;width:100%;height:auto;max-height:16rem;object-fit:contain"><figcaption>${caption} <small>Illustration.</small></figcaption></figure>`;
}
