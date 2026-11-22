import {opportunities} from './grant-opportunities.mjs';

export function mountGrantResearch(container, {committee=false, wish, signal}) {
  const prefix = committee ? 'committee-' : '';
  container.innerHTML = `<section id="${prefix}grant-research" aria-labelledby="${prefix}research-title"><h2 id="${prefix}research-title">Research the next round</h2>
    <p>Browse the <a href="https://auraofintelligence.github.io/stradbroke-grants-lab/index.html">Stradbroke Grants Lab</a> for island-wide funding. Open the <a href="https://auraofintelligence.github.io/stradbroke-grants-lab/ledger-projects.html#ledger-plfc-community-platform">fishing club project</a> or the <a href="https://auraofintelligence.github.io/stradbroke-grants-lab/grant-watchlist.html">island funding watchlist</a>.</p>
    <ol class="gr-steps"><li><strong>Choose a club project.</strong> Agree who it will help and roughly what it will cost.</li><li><strong>Check the funder’s guidelines.</strong> Look for the applicant, location, cash contribution and closing time. “Watch” means there is a program worth following and an open round still needs confirmation.</li><li><strong>Give someone the next step.</strong> Officers can save a promising round in the ${committee?'committee grant register':'<a href="#committee/grants">committee grant register</a>'}, choose who will follow up and record the deadline.</li></ol>
    <details class="gr-prompt"><summary>Use an AI assistant to refresh the search</summary>
      <p>Copy these instructions into a research assistant with web access. Check its sources before an officer saves a grant.</p>
      <label for="${prefix}grant-prompt">Research instructions</label>
      <textarea id="${prefix}grant-prompt" data-gr-prompt rows="12" readonly>Find grants for Point Lookout Fishing Club Inc., a volunteer-run fishing club on Minjerribah / North Stradbroke Island in Redland City, Queensland. Use today’s date in Brisbane and search for both new rounds and changes to previously listed grants.

Search Redland City Council grants and sponsorships, Queensland community fishing, sport and recreation programs, the Gambling Community Benefit Fund, environment, resilience and tourism programs, Australian Government GrantConnect and grants.gov.au, and private or philanthropic foundations. Look for opportunities for children and families, First Nations youth, volunteering, community equipment, self-sufficiency, wildlife care, regional and island communities, accessible recreation and local tourism.

Use official guidelines for each round. Verify who can apply, the region or postcode, any DGR or ABN requirement, co-contribution, amount, closing time and time zone. Distinguish opportunities the club can pursue directly from those requiring a partner, auspice or Indigenous-led applicant. Confirm any remote or regional classification for the particular program. The club’s incorporation number is IA4834908. The Treasurer needs to confirm the ABN for the incorporated applicant. Seek local leadership and consent before proposing a First Nations partnership.

Compare with the previous findings below. Flag new and changed rounds, closed rounds, announced reopening dates and any source you could not verify. Link to the funder’s round page and record the date you checked. Report separate sections for open, upcoming, watch and closed rounds. Give each result a project category, a practical use for this club, any eligibility hurdle and one next step. Identify the three best leads for committee review and explain why. Return a short update the club can read. Applications, contacts and payments require separate committee approval.</textarea>
      <button type="button" class="button outline" id="${prefix}copy-grant-prompt" data-gr-copy>Copy research instructions</button><p role="status" id="${prefix}grant-copy-status" data-gr-copied></p>
    </details></section>`;
  const prompt = container.querySelector('[data-gr-prompt]');
  prompt.value += '\n\nReview the Stradbroke Grants Lab watchlist at https://auraofintelligence.github.io/stradbroke-grants-lab/grant-watchlist.html for additional leads. Verify each with its original funder.\n\nClub funding sources from the last search\n' + opportunities.map(grant =>
    [grant.name, grant.funder, grant.status, grant.closing || 'no confirmed closing date', 'checked ' + grant.checked, grant.url].join(' | ')
  ).join('\n');
  const copy = container.querySelector('[data-gr-copy]');
  const copied = container.querySelector('[data-gr-copied]');
  if (committee && wish?.name) {
    const base = prompt.value;
    const option = document.createElement('label');
    const check = document.createElement('input');
    check.type = 'checkbox';
    option.className = 'gr-wish-prompt-option';
    option.append(check, 'Include the name and purpose of “' + wish.name + '” in the instructions I copy');
    prompt.parentElement.insertBefore(option, prompt.previousElementSibling);
    check.addEventListener('change', () => {
      prompt.value = check.checked
        ? base + '\n\nEquipment wish selected by the committee\n' + wish.name + '\n' + (wish.purpose || '') +
          '\nLook for funding that covers this item and its intended use. Identify any purchase exclusions and whether a loan, hire or in-kind offer could meet the need. If the sources show no suitable round, say so.'
        : base;
      copied.textContent = '';
    }, {signal});
  }
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(prompt.value);
      if (signal.aborted) return;
      copied.textContent = 'Copied. Paste the instructions into your research assistant.';
    } catch {
      if (signal.aborted) return;
      prompt.focus();
      prompt.select();
      copied.textContent = 'The instructions are selected. Choose Copy in your browser, then paste them into your research assistant.';
    }
  }, {signal});
}
