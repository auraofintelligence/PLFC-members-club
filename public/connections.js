export function setupConnectionGuides(showDialog) {
  const guides = {
    transcription: {
      title: 'From a conversation to useful notes',
      short: 'Record once, then review a transcript and a draft of the decisions.',
      now: 'With everyone’s consent, the recorder captures voice or video. Supported browsers can transcribe speech. Prepare draft minutes finds explicit decisions and jobs on this device. The optional Cloudflare AI step sends the reviewed text after separate consent and shows source quotes for the committee to check.',
      choices: [
        'Browser live transcript: the quickest demonstration, but support varies between browsers.',
        'Recorded audio transcription: send the saved recording to a chosen speech service, then review the result.',
        'AI draft notes: turn an approved transcript into a proposed summary and follow-ups for a person to check.'
      ],
      data: 'The recording or transcript, the meeting date and any names spoken in the meeting. The chosen provider would process this information.',
      cost: 'Cloud speech and AI services commonly charge by usage. Choose a spending limit before connecting one.',
      decision: 'Choose the service and account owner. Agree recording consent, who can see the files, how long to keep them and who approves the final notes.',
      technical: 'A protected server connection would upload the recording, track transcription status and return a draft to this meeting. API keys stay on the server. An approved transcript is a source record; an AI summary is a separate draft.'
    },
    calendar: {
      title: 'A calendar everyone can follow',
      short: 'Keep agreed dates in one place, with reminders people choose to receive.',
      now: 'People can add a confirmed club date to their calendar when one is available. After the committee approves its minutes, each dated job has a calendar reminder file with a one-day alert. People choose whether to import it. Later changes need to be updated in that copy.',
      choices: [
        'Download a calendar date: simple and no connected account needed.',
        'Subscribe to a club calendar: approved event changes update in people’s calendar apps when those apps refresh.',
        'Connect the club’s Google or Microsoft calendar and an email service: add reminders and manage dates from the club workspace.'
      ],
      data: 'Public calendar subscribers need only approved event details. Private reminders would also use a member’s contact details and communication preferences.',
      cost: 'A basic calendar feed needs no separate calendar subscription. An email service may charge for delivery.',
      decision: 'Name who can propose and approve dates. Choose a calendar owner and reminder channels, with an agreed budget and opt-in preferences.',
      technical: 'The meeting desk prepares an agenda email seven days before a meeting and a club chat reminder one hour before. An officer reviews and shares each draft. External delivery would require a club-owned service, a budget, approved recipients and a sending record.'
    },
    conditions: {
      title: 'Useful conditions, clearly sourced',
      short: 'Bring weather, tides and the astronomical calendar into the same view.',
      now: 'The demo has real weather and offshore marine forecasts, sun and moon calculations, and official 2026 and 2027 Brisbane Bar tide reference predictions. BOM radar opens on its official website. These connections still need operational and licensing decisions before club use.',
      choices: [
        'Try the current demonstration, with clear forecast times and a named tide reference.',
        'Choose the licensed weather and swell provider for a sponsored public service, with a budget and update monitoring.',
        'Agree the right tide reference and any verified local corrections. For radar inside the site, arrange an authorised data feed; the official BOM page does not allow embedding.'
      ],
      data: 'The selected general coastal location and date. No member contact details or precise fishing spots are needed.',
      cost: 'Commercial or sponsor-supported use may need a paid weather licence. Confirm the provider’s terms and a spending limit before launch.',
      decision: 'Choose the provider and tide station. Agree the licence, budget and who checks that the information is current.',
      technical: 'A server-side API connection can retrieve and cache forecasts without exposing a key. Tide datum and station must stay explicit. Mean sea-level forecasts are not interchangeable with official tide heights. The local astronomy calculation is independent of a live provider.',
      links: '<p><a href="https://www.msq.qld.gov.au/tides/open-data" target="_blank" rel="noopener">Queensland tide data</a> · <a href="https://open-meteo.com/en/terms" target="_blank" rel="noopener">Example weather provider terms</a></p>'
    },
    finnius: {
      title: 'Finnius, with his own personality',
      short: 'A friendly guide for joining, finding club information and having a laugh.',
      now: 'The existing character artwork is here. The custom GPT, live chat, voice and animated avatar are not connected.',
      choices: [
        'Use the existing on-site guide and original character clips for the club walkthrough.',
        'Build an on-site guide using approved club information and Finnius’s all ages personality.',
        'Add optional voice and an animated dolphin after the core club experience is settled.'
      ],
      data: 'Questions people choose to ask. Voice would additionally send their speech to the selected voice provider. Private member or committee records need separate permissions.',
      cost: 'A link and an embedded assistant are different options. On-site AI, speech and avatar services may each charge by usage.',
      decision: 'Review Luke’s original GPT instructions and examples. Agree the character, provider, account owner, budget and which club information Finnius can answer from.',
      technical: 'A custom GPT link does not automatically become an embedded website API. An on-site assistant needs its own server integration, approved knowledge and permission checks. The original GPT’s private conversations must not be imported automatically.'
    },
    partners: {
      title: 'Connect the club to the island',
      short: 'Share approved club events and media through the wider network.',
      now: 'PLFC can record individual consent, an approved meeting decision and written acceptance for a particular Ready SETCO task. The person opens the partner’s separate enquiry form. The media network has its own approval process.',
      choices: [
        'Start with voluntary enquiries. Members choose volunteering or paid work in their membership area.',
        'For event delivery, record the committee decision, the exact job, which responsibilities PLFC retains, both leads, the acceptance reference and a review date.',
        'Build a connection later for approved events, venue screens or media publishing, once both systems agree the format.'
      ],
      data: 'Only the event details and media specifically approved for sharing, with the relevant photo permissions and credit. Membership records are a separate decision.',
      cost: 'Integration work, screen use and media services need their own agreed scope and budget. No cost or partnership terms are assumed.',
      decision: 'Obtain committee sign-off. Name the club approver and network contact, agree what may be shared, and set correction and takedown steps.',
      technical: 'The inspected Ready SETCO project has participation intake and reviewed map records. Event sync is a new interface. The media network has a proposed editorial workflow, so an automated publishing API must not be assumed. Begin with a reviewed package and a single venue pilot.'
    },
    authority: {
      title: 'Who can approve what?',
      short: 'Separate proposed changes, approved club records and public updates.',
      now: 'The committee desk records approval of the minutes and the time in the club database. After approval the original notes, decisions, owners and due dates are locked. The committee can mark each agreed job complete.',
      choices: [
        'Members manage their own details and submissions.',
        'Committee members prepare meeting notes and follow-ups within their approved role.',
        'A named authorised publisher releases approved club updates and approved media.'
      ],
      data: 'Account identity, approved role and a record of who changed or approved a record and when. Public summaries need their own reviewed content.',
      cost: 'Account, storage and identity services depend on the chosen setup. Budget and responsibility should sit with the club rather than a personal account.',
      decision: 'Agree an authority list, document ownership, review dates and how access is removed when someone changes role. Choose which management standards the club wants to work towards.',
      technical: 'The server verifies the committee role and meeting version on each save. A conflicting update asks the secretary to compare the latest record. Minutes approval and subsequent job updates have an audit history. ISO certification would require a separate assessment.'
    }
  };

  const cards=Object.entries(guides).map(([key,guide])=>`<article class="connection-card"><span class="pill">Not connected for club use</span><h3>${guide.title}</h3><p>${guide.short}</p><button class="text-link" data-connection="${key}">About this connection</button></article>`).join('');
  document.querySelector('.integration-panel').insertAdjacentHTML('afterend', `<section class="connection-guide"><span class="eyebrow">A FEW CHOICES FOR THE COMMITTEE</span><h2>What would we like to connect?</h2><p class="page-intro">An API is simply a connection that lets services work together. These guides explain the choices. Nothing here is approval to switch a service on.</p><div class="connection-grid">${cards}</div></section>`);
  document.querySelector('.transcript-details').insertAdjacentHTML('beforeend','<button class="text-link connection-help" data-connection="transcription">About transcription and AI notes</button>');
  document.querySelector('.calendar-plans').insertAdjacentHTML('beforeend','<button class="text-link connection-help" data-connection="calendar">About calendar sync and reminders</button>');
  document.querySelector('.conditions-links').insertAdjacentHTML('afterend','<button class="text-link connection-help" data-connection="conditions">About weather and tide connections</button>');
  document.querySelector('#finnius-help').insertAdjacentHTML('afterend','<button class="text-link connection-help" data-connection="finnius">About the Finnius connection</button>');
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-connection]');
    if(!button)return;
    const guide=guides[button.dataset.connection];
    if(!guide)return;
    showDialog(guide.title, `<p><strong>Demo only. Not complete or available for club use yet.</strong></p><p>${guide.now}</p><h3>The choices</h3><ul>${guide.choices.map(choice=>`<li>${choice}</li>`).join('')}</ul><h3>Information it would use</h3><p>${guide.data}</p><h3>Cost to consider</h3><p>${guide.cost}</p><h3>What the committee needs to decide</h3><p>${guide.decision}</p><details class="api-details"><summary>Optional API detail</summary><p>${guide.technical}</p>${guide.links??''}</details>`);
  });
}
