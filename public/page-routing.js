const PAGES = new Set(['home', 'events', 'sponsors', 'grants', 'fishing', 'guide', 'members', 'shop', 'stock', 'committee']);
const GRANT_SECTIONS = new Set(['funding', 'projects', 'research', 'club-details']);
const LEGACY_GUIDE = {
  'guide-fish': 'fish', 'guide-rig': 'rig', 'guide-knots': 'knots', 'guide-trip': 'trip',
  'guide-conditions': 'conditions', 'guide-rules': 'rules', 'guide-water-rules': 'zones',
  'guide-safety': 'safety', 'guide-jetty': 'jetty', 'guide-care': 'care',
  'guide-photo-practice': 'brag-mat', 'guide-brag-mat': 'brag-mat',
  'guide-kitchen': 'kitchen', 'guide-sharks': 'sharks',
  'guide-customary-rights': 'customary-rights', 'guide-rights-topic': 'customary-rights',
  'guide-reporting': 'reporting', 'guide-reporting-topic': 'reporting',
  'guide-crabbing': 'crabbing', 'guide-spearfishing': 'spearfishing',
  'guide-bait-gathering': 'bait-gathering', 'guide-wildlife': 'wildlife',
};

export function guideHashForDestination(destination) {
  const slug = LEGACY_GUIDE[destination];
  return slug ? '#guide/' + slug : '#guide';
}

export function parseLocationHash(hash = '') {
  let path;
  try { path = decodeURIComponent(String(hash).replace(/^#/, '')).replace(/\/+$/, ''); }
  catch { return /^#?guide\//.test(String(hash)) ? {page: 'guide', slug: '', hash: '#guide'} : {page: 'home', slug: '', hash: '#home'}; }
  const rigSpecies = /^guide\/rig\?species=([a-z]+(?:-[a-z]+)*)$/.exec(path);
  if (rigSpecies) return {page:'guide', slug:'rig', species:rigSpecies[1], hash:'#'+path};
  const chosenKnot = /^guide\/knots\?knot=([a-z]+(?:-[a-z]+)*)$/.exec(path);
  if (chosenKnot) return {page:'guide', slug:'knots', knot:chosenKnot[1], hash:'#'+path};
  if (path === 'guide/knots?compare=strength') return {page:'guide', slug:'knots', compare:'strength', hash:'#'+path};
  if (path === 'guide/diving') path = 'guide/spearfishing';
  if (LEGACY_GUIDE[path]) path = 'guide/' + LEGACY_GUIDE[path];
  const [base = '', ...segments] = path.split('/');
  const page = PAGES.has(base) ? base : 'home';
  if (page === 'grants') {
    const slug = segments.length === 1 && GRANT_SECTIONS.has(segments[0]) ? segments[0] : '';
    return {page, slug, hash: '#grants' + (slug ? '/' + slug : '')};
  }
  const privateSections={members:['notices','equipment-wishes','meals','recipes','safety','calendar','leaderboard','catch-map','friends','profile','social','news','conversation','minutes','journal','membership','help-out'],committee:['grants','member-notice','notices','equipment','sponsors','returning','safety','leaderboard','events','social','todos','agm-jobs','news','handover','meetings','applications','automations','ready-setco','documents','access'],stock:['reports','returning']};
  if(segments.length===1 && privateSections[page]?.includes(segments[0]))return {page,slug:segments[0],hash:'#'+page+'/'+segments[0]};
  if (page === 'guide') {
    const slug = segments.length === 1 && /^[a-z]+(?:-[a-z]+)*$/.test(segments[0]) ? segments[0] : '';
    return {page, slug, hash: '#guide' + (slug ? '/' + slug : '')};
  }
  return {page, slug: '', hash: '#' + page};
}

export function normaliseGuideLinks(container = document) {
  container.querySelectorAll('a[data-guide-destination]').forEach(link => {
    link.setAttribute('href', guideHashForDestination(link.dataset.guideDestination));
    link.removeAttribute('data-guide-destination');
  });
}
