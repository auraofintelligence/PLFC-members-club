import {mountGrantFinder} from './grant-finder.js?v=20261121-clubhouse-menu';
import {mountGrantResearch} from './grant-research.js';

const activePages = new WeakMap();

export function mountGrantPage(container, {signal}={}) {
  activePages.get(container)?.();
  if (signal?.aborted) return () => {};
  const controller = new AbortController();
  const cleanup = () => {
    controller.abort();
    signal?.removeEventListener('abort',cleanup);
    if (activePages.get(container) === cleanup) {
      activePages.delete(container);
      container.replaceChildren();
    }
  };
  activePages.set(container,cleanup);
  signal?.addEventListener('abort',cleanup,{once:true});
  container.innerHTML = `<div class="gr-page">
  <section class="gr-intro" aria-labelledby="grant-page-title"><div><h1 id="grant-page-title">Grants and community projects</h1>
    <p>On Minjerribah, a spare rod, a patient teacher and a safe spot on the shore can give a young angler their first day fishing. We welcome conversations with funders and community groups about what we could do together.</p>
    <a class="button" href="#grants/funding">Find funding</a></div>
    <img src="/assets/point-lookout.jpg" alt="The rocky coast at Point Lookout on Minjerribah" width="680" height="450"></section>
  <nav class="gr-jumps" aria-label="On this page"><a href="#grants/funding">Funding finder</a><a href="#grants/projects">Project ideas</a><a href="#grants/research">Research the next round</a><a href="#grants/club-details">Club details</a></nav>
  <section id="grants-funding" data-gr-public-finder></section>
  <section id="grants-projects"><h2>Ideas for local projects</h2><p>These are proposals for discussion. The committee would agree on the partners, budget and dates before a project goes ahead.</p>
    <div class="gr-projects">
      <article><h3>A first cast for families</h3><p>Pair first-timers with local volunteers for a shore session on knots, measuring a fish and releasing it carefully. A partner could lend rods or help teach. We could count first-time participants and kits loaned.</p></article>
      <article><h3>Keep line away from wildlife</h3><p>Invite locals to a foreshore clean-up and a short demonstration of safe line disposal. Volunteers could record the sites covered and the line collected.</p></article>
      <article><h3>Safer club days</h3><p>Bring volunteers together for first aid training before community fishing days. A training partner could provide an instructor. The club could record attendance and check first aid supplies before its next event.</p></article>
    </div></section>
  <div data-gr-public-research></div>
  <section class="gr-about" id="grants-club-details"><h2>Club details for grant applications</h2>
    <p><strong>POINT LOOKOUT FISHING CLUB INC</strong> was incorporated in Queensland on 22 January 2025, number IA4834908. A separate ABN Lookup record for “Point Lookout Fishing Club” lists ABN 58 659 158 278 as an “Other Unincorporated Entity”. Ask the Treasurer to reconcile the records and confirm the ABN for the incorporated applicant before submitting a funding application.</p>
    <p>For each round, check the funder’s requirements for incorporation, any auspice arrangement and deductible gift recipient status. The funder decides eligibility.</p>
    <nav aria-label="Club background"><a href="https://qocar.fairtrading.qld.gov.au/home/search?Name=Point%20Lookout%20Fishing%20Club&amp;Number=&amp;Postcode=&amp;PageNumber=1">Queensland association register</a><a href="https://abr.business.gov.au/ABN/View?abn=58659158278">ABN Lookup record</a><a href="/constitution.pdf">Club constitution (PDF)</a><a href="/media-pack.html">Club media pack</a></nav>
  </section>
  </div>`;
  mountGrantFinder(container.querySelector('[data-gr-public-finder]'),{signal:controller.signal});
  mountGrantResearch(container.querySelector('[data-gr-public-research]'),{signal:controller.signal});
  return cleanup;
}

export function scrollToGrantSection(container, section) {
  const targets = {funding:'#grants-funding',projects:'#grants-projects',research:'#grant-research',
    'grant-research':'#grant-research','club-details':'#grants-club-details'};
  if (!Object.hasOwn(targets,section)) return;
  const heading = container.querySelector(targets[section])?.querySelector('h2');
  if (!heading) return;
  heading.tabIndex = -1;
  heading.focus({preventScroll:true});
  heading.scrollIntoView({block:'start'});
}
