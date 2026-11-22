const by2 = ['CC BY 2.0','https://creativecommons.org/licenses/by/2.0/'];
const bySa4 = ['CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/'];
function commons(id, file, alt, author, [license,licenseUrl], change='Resized') {
  return {src:'/assets/catch-prep/'+id+'.webp',alt,credit:author+' · '+change+' for the guide',source:'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(file),license,licenseUrl};
}
const cleanGuide = 'How-to-clean-your-seafood';
const filletGuide = 'How-to-fillet-your-fish';
const squidGuide = 'How-to-prepare-squid-cuttlefish-and-octopus';
// The publisher's site-wide licence is at https://www.fishfiles.com.au/en/frdc/about/legal/copyright
function fishfiles(id, guide, alt) {
  return {
    src: '/assets/catch-prep/' + id + '.webp',
    alt,
    credit: 'Fisheries Research and Development Corporation · WebP version',
    source: 'https://www.fishfiles.com.au/Preparing-seafood/How-to-guides/' + guide,
    license: 'CC BY 3.0 AU',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/au/'
  };
}
export const catchPrepPhotos = {
  scale: fishfiles('scale', cleanGuide, 'Lifting scales on a yellowfin bream in short strokes towards the head.'),
  gut: fishfiles('gut', cleanGuide, 'The fish is on its side as the belly is opened from the vent towards the gills.'),
  gutClear: fishfiles('gut-clear', cleanGuide, 'One hand holds the belly cavity open while the other eases the gut out.'),
  gill: fishfiles('gill', cleanGuide, 'The red gills being lifted out through the open gill cover.'),
  back: fishfiles('back', filletGuide, 'A filleting knife enters the upper edge of the fish and follows the backbone.'),
  ribs: fishfiles('ribs', filletGuide, 'The fillet is lifted so the knife can follow the curve over the rib cage.'),
  skinFlat: fishfiles('skin-flat', cleanGuide, 'The blade lies nearly flat against the board between the fillet and its skin.'),
  flathead: fishfiles('flathead', cleanGuide, 'Flathead viewed from above, showing where the knife sits for removing the head.'),
  squidPull: fishfiles('squid-pull', squidGuide, 'One hand holds the mantle open as the other draws the head and innards out together.'),
  squidPeel: fishfiles('squid-peel', squidGuide, 'Coloured skin being pulled away from the pale squid tube.'),
  squidInk: fishfiles('squid-ink', squidGuide, 'The ink sac and attached innards on the board after removal from the squid.'),
  squidTrim: fishfiles('squid-trim', squidGuide, 'The arm cluster is separated from the head while preparing the squid.'),
  shoulder:commons('shoulder','Filleting_101_(5716142933).jpg','A gloved hand holds the head while the demonstrator makes the first cut behind the gill cover.','US Fish and Wildlife Service, Midwest Region',by2,'Cropped and resized'),
  skin:commons('skin','Filleting_101_(5716703654).jpg','In a fish-filleting demonstration, a cook shows where the flesh separates from the skin.','US Fish and Wildlife Service, Midwest Region',by2,'Cropped and resized'),
  whole:commons('whole','Sea_bass_as_I_cooked_it_(1526986088).jpg','Two herb-topped whole sea bass on a foil-lined baking tray, with the head and tail still attached.','Andy / Andrew Fogg',by2,'Cropped and resized'),
  fillets:commons('fillets','Cod_fillet.jpg','Two raw cod fillet portions side by side, showing the grain and thickness of the flesh.','Tiia Monto',bySa4),
  pack: {
    src: '/assets/catch-prep/pack.webp',
    alt: 'An archival kitchen photograph shows four separate seafood portions in clear bags, each with an identification tag.',
    credit: 'US Fish and Wildlife Service · Fishery Leaflet 429, figure 3 · cropped and resized',
    source: 'https://spo.nmfs.noaa.gov/sites/default/files/legacy-pdfs/leaflet429.pdf#page=50',
    license: 'US public domain',
    licenseUrl: 'https://www.usa.gov/government-copyright'
  },
  squid:commons('squid','Loligo_vulgaris.jpg','Whole European squid showing the broad mantle, side fins and the arms and two long tentacles around the head.','© Hans Hillewaert',bySa4),
  squidRings:commons('squid-rings','Chilled_squid_rings.jpg','Chilled squid tube cut crosswise into pale rings.','François Nguyen',by2),
  squidTentacles:commons('squid-tentacles','Chilled_squid_tentacles.jpg','A close view of chilled squid arms and tentacles, with rows of suckers.','François Nguyen',by2),
};
