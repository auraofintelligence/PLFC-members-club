function sequence(filenames, descriptions) {
  return descriptions.map(([alt, caption], index) => ({
    src: '/assets/tackle/pelagic-steps/' + filenames + '-' + (index + 1) + '.webp',
    alt,
    caption,
    credit: 'AI illustration for Point Lookout Fishing Club.'
  }));
}

export const pelagicStepPhotos = {
  troll: sequence('wired-minnow', [
    ['Heavy clear leader and dark bite wire connected to opposite eyes of a barrel swivel.', 'The swivel joins the clear leader to the short wire bite trace.'],
    ['Close view of a wire snap at the tow eye on the clear bib of a blue diving minnow.', 'Close the snap through the tow eye and check that the hooks swing free.'],
    ['A blue minnow makes a small wake as it swims on a taut line beside a white gunwale.', 'Watch the lure swim beside the boat before letting it run astern.']
  ]),
  bayDiver: sequence('bay-diver', [
    ['Two silver hard lures, one with a short clear bib and the other with a longer bib.', 'These bibs differ in size. The packet gives the running depth for each lure.'],
    ['Close view of clear leader at the tow eye on a minnow’s clear diving bib.', 'Look for the tow eye and use the connection recommended for that lure.'],
    ['A diving minnow tracks through open blue water beside a group of small baitfish.', 'Run the lure past the edge of the bait school.']
  ]),
  topwater: sequence('surface-stickbait', [
    ['A spinning rod and reel on the deck alongside a slender blue and silver stickbait.', 'Check the casting weight on your rod before choosing the stickbait.'],
    ['A slender bibless lure with a small tow eye at the nose and separate single hooks at the belly and tail.', 'Find the nose eye and check each hook can swing freely.'],
    ['A silver stickbait leaves a wake on the surface with small fish splashing in the distance.', 'Cast into clear water ahead of the activity and twitch the lure back.']
  ]),
  vertical: sequence('vertical-jig', [
    ['A clear leader and a single assist hook on short red cord meet at one solid steel ring.', 'The leader and assist cord share the same solid ring.'],
    ['Close view of split-ring pliers gripping a coiled split ring above a metal jig beside the assist cord.', 'Use split-ring pliers to attach the jig to the solid ring.'],
    ['A slim metal jig hangs straight down from a boat above fish in deep blue water.', 'Watch the line angle as the boat drifts. Aim to work the jig close to vertical.']
  ])
};
