import {pelagicStepPhotos} from './pelagic-step-photos.js';
import {reefStepPhotos} from './reef-step-photos.js';

const tackle = '/assets/tackle/';
const credit = 'AI-assisted club illustration.';

function picture(file, alt, caption) {
  return {src: tackle + file + '.webp', alt, caption, credit};
}

const sinker = picture('rig-photos/running-step-1', 'A clear line runs through the centre of a ball sinker.', 'Thread the reel line through the hole so the weight can slide.');
const swivel = picture('rig-photos/running-step-2', 'A barrel swivel with one line tied to each of its two eyes.', 'The reel line goes on one eye. The hook trace goes on the other.');
const worm = picture('rig-photos/running-step-3', 'Short worm bait threaded on a hook with the point showing.', 'Leave enough space inside the bend for the hook to take hold.');
const baitholderTrace = picture('rig-steps/trace-baitholder', 'A swivel, clear leader and a baitholder hook laid out in order.', 'Follow the trace from the swivel to the hook eye. The line is shortened here to show both knots.');
const circleTrace = picture('rig-steps/trace-circle', 'Clear leader joining a barrel swivel to an inward-pointing circle hook.', 'The hook eye takes the free end of the trace. See the trace length above for fishing.');
const whitingTrace = picture('rig-steps/trace-longshank', 'A fine whiting trace runs from the swivel to the eye of a long-shank hook.', 'For winter whiting, leave about 60 cm of trace. The picture shows the two ends close together.');

function sequence(prefix, views) {
  return views.map(([name, alt, caption]) => picture('rig-steps/' + prefix + '-' + name, alt, caption));
}

export const rigStepPhotos = {
  running: [sinker, swivel, worm],
  winter: [sinker, whitingTrace, worm],
  bream: [sinker, baitholderTrace, picture('baited-prawn', 'Prawn flesh along the shank of a single hook.', 'Keep the prawn small enough to leave the bend and point clear.')],
  dart: [sinker, baitholderTrace, picture('baited-pipi', 'A small piece of pipi flesh pinned on a single hook.', 'Use just enough flesh to hold on through the wash.')],
  'fish-strip': [sinker, circleTrace, picture('baited-strip', 'A tapered strip pinned at its thick end, narrow end hanging free.', 'The trailing end can flutter. Trim it if the strip spins.')],
  float: sequence('float', [
    ['rubbers', 'A black pencil float with an orange tip. Two small rubbers hold the line against the float.', 'The rubbers grip the line. Slide the float to change how deep the weed drifts.'],
    ['shot', 'Two small split shot on a line beside a loose shot with its slot showing.', 'The split closes around the line. Test the float in the water as you add weight.'],
    ['weed', 'A tuft of green weed on a fine hook. Loose strands extend beyond the bend.', 'Wind the weed along the shank and leave some strands trailing.'],
  ]),
  plastic: sequence('plastic', [
    ['measure', 'A bare jighead beside an olive paddle-tail lure with both noses facing the same way.', 'Line up the noses and note where the bend meets the lure’s back.'],
    ['thread', 'A hook coming out through the top of an olive soft plastic behind the jighead.', 'Bring the point out along the centre of the back so the body sits straight.'],
    ['fitted', 'The soft plastic seated against the lead head with its paddle tail free.', 'Look along the body for a kink, then check that the tail beats as you swim it.'],
  ]),
  gang: sequence('gang', [
    ['match', 'A whole pilchard beside a gang of hooks on a bait board.', 'Check the length of the linked hooks against the bait before pinning it.'],
    ['pinned', 'A leader leaves near a pilchard’s head with hooks running along the flank.', 'Sight along the bait after pinning. A kink makes it twist as you retrieve.'],
    ['swim', 'A rigged pilchard held straight by the trace in the wash.', 'Watch the bait in the water beside you before casting.'],
  ]),
  'bait-jig': sequence('bait-jig', [
    ['card', 'Small dressed hooks stored in slots in a rig holder, with a loop above.', 'Find the top end on your packet before freeing the hooks.'],
    ['sinker', 'A teardrop sinker hanging by its eye from the bottom snap.', 'Close the clip through the sinker eye before lowering it.'],
    ['school', 'A bait jig hanging vertically beside small fish, with its weight at the bottom.', 'Keep the weight below the dressed hooks as you lift gently.'],
  ]),
  squid: [
    picture('rig-steps/leader-join', 'Fine green braid meeting clear leader in a slim line join.', 'The clear leader runs from this join to the nose of the squid jig.'),
    picture('rig-steps/squid-nose', 'Clear line attached to the metal eye at the nose of a cloth-covered squid jig.', 'Find the tow eye at the nose, just above the weighted keel.'),
    picture('rig-steps/squid-sink', 'A weighted squid jig sinking nose first above a bed of seagrass.', 'Watch its fall. Lift again before it reaches the weed.'),
  ],
  metal: sequence('metal', [
    ['match', 'A slender baitfish and a shiny metal lure of similar length.', 'Match the length and profile of the baitfish being chased.'],
    ['ring', 'A single hook joined by a split ring to the tail eye of a casting metal.', 'Check the tail hook and split ring. Your leader attaches at the opposite end.'],
    ['school', 'A patch of surface disturbance in the bay with clear water beside it.', 'Aim beside the school so the retrieve crosses its edge.'],
  ]),
  ...reefStepPhotos,
  ...pelagicStepPhotos,
};
