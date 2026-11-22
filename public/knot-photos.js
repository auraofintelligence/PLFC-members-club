const filePage = name => 'https://commons.wikimedia.org/wiki/File:' + name;
const link = (url, title) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>`;

export const monoDropperPhoto = {
  src: '/assets/knots/mono-dropper-loop.webp',
  alt: 'A single translucent loop drops from the middle of a straight leader, between two sets of snug turns.',
  caption: 'Follow the line from left to right. The loop projecting between the turns is where the hook branch goes.',
  credit: 'AI-assisted club illustration. ' + link('https://getfishing.com.au/dropper-loop/', 'Watch Che Carson tie the dropper loop'),
};

const palomar = [
  ['palomar-jig-double', 'Follow the two clear strands through the eye of the pink jig. The loop is on the left.'],
  ['palomar-jig-overhand', 'The loose overhand knot sits beside the pink head. Leave the long loop open above it.'],
  ['palomar-jig-loop', 'The big loop goes over the whole jig, past the hook point and back up to the eye.'],
  ['palomar-jig-seated', 'The knot sits against the jig eye. The long line goes up and the short spare end points right.'],
];

export function palomarCreditHtml() {
  return `Palomar photographs by ${link('https://www.instructables.com/How-to-Tie-a-Palomar-Knot/', 'isaachill65879 on Instructables')}. Cropped and resized for this lesson under ${link('https://creativecommons.org/licenses/by-nc-sa/4.0/', 'CC BY-NC-SA 4.0')}.`;
}

const examples = {
  snell: ['snell', 540, 'Finished whipping snell. The bright green line leaves the eye and the tight wraps grip the hook shank.', `Photo by ${link(filePage('Snell_Knot.jpg'), 'Fishingknotsfast')}. Resized WebP under ${link('https://creativecommons.org/licenses/by-sa/4.0/', 'CC BY-SA 4.0')}.`],
};

export function knotPhotoHtml(key, stepIndex = 0) {
  let example = examples[key];
  if (key === 'dropper-loop') {
    const {src, alt, caption, credit} = monoDropperPhoto;
    return `<figure class="knot-photo"><img src="${src}" width="960" height="540" loading="lazy" decoding="async" alt="${alt}"><figcaption>${caption}<br><small>${credit}</small></figcaption></figure>`;
  }
  if (key === 'palomar') {
    const [image, caption] = palomar[stepIndex] || palomar[0];
    return `<figure class="knot-photo"><button type="button" class="kg-zoom" data-knot-enlarge aria-label="Enlarge the photo for step ${stepIndex+1}" aria-haspopup="dialog"><img src="/assets/knots/${image}.webp" alt="${caption}" width="1024" height="768" loading="lazy" decoding="async"><span>Enlarge photo</span></button><figcaption>${caption}<details><summary>Photo credit</summary><small>${palomarCreditHtml()}</small></details></figcaption></figure>`;
  }
  if (!Array.isArray(example)) return '';
  const [image, height, caption, credit] = example;
  return `<figure class="knot-photo"><img src="/assets/knots/${image}.webp" width="960" height="${height}" loading="lazy" decoding="async" alt="${caption}"><figcaption>${caption}<details><summary>Photo credit</summary><small>${credit}</small></details></figcaption></figure>`;
}
