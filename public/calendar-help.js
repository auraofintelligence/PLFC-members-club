const HELP = {
  google: 'https://support.google.com/calendar/answer/37118?hl=en',
  outlook: 'https://support.microsoft.com/en-us/outlook/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web',
  apple: 'https://support.apple.com/en-mide/guide/calendar/icl1023/mac',
};

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const utcStamp = (value) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

function localLabels(event) {
  const date = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Brisbane', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(event.startsAt));
  const clock = (value) => new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Brisbane', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value));
  return { date, start: clock(event.startsAt), end: clock(event.endsAt) };
}

function pickEvent(events, requestedUrl) {
  const list = Array.isArray(events) ? events : [];
  const exact = list.find((event) => {
    try { return new URL(event.calendarUrl, window.location.href).pathname === requestedUrl.pathname; } catch { return false; }
  });
  const source = exact || (requestedUrl.pathname === '/calendar.ics' ? list[0] : null);
  if(!source)return null;
  const start = Date.parse(source.startsAt);
  if (!Number.isFinite(start)) return null;
  const end = Date.parse(source.endsAt);
  return { ...source, endsAt: Number.isFinite(end) && end > start ? new Date(end).toISOString() : new Date(start + 3_600_000).toISOString() };
}

function meetingFile(event) {
  try {
    const url = new URL(event.calendarUrl, window.location.href);
    if (url.origin === window.location.origin && /\.ics$/i.test(url.pathname)) return url.pathname + url.search;
  } catch { /* Use the club's known meeting file if a source URL is invalid. */ }
  return '/calendar.ics';
}

function chooser(event) {
  const labels = localLabels(event);
  const estimate = event.durationConfirmed === false ? 'The end time is an estimate. Allow about one hour.' : '';
  const details = `${event.title}\n${labels.date}\n${labels.start} to ${labels.end} AEST (Brisbane time)\n${event.location}${estimate ? `\n${estimate}` : ''}\nPoint Lookout Fishing Club`;
  const google = new URL('https://calendar.google.com/calendar/render');
  google.search = new URLSearchParams({ action: 'TEMPLATE', text: event.title, dates: `${utcStamp(event.startsAt)}/${utcStamp(event.endsAt)}`, ctz: 'Australia/Brisbane', location: event.location, details: `${event.description || 'Point Lookout Fishing Club meeting.'}${estimate ? `\n${estimate}` : ''}\nPlease check the club for any later change to this meeting.` }).toString();
  const download = `<a class="button calendar-file-button" href="${escape(meetingFile(event))}" download="plfc-meeting.ics" data-raw-calendar data-calendar-download>1. Save the meeting file</a>`;
  const official = (url, label) => `<a class="calendar-official-help" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${label} <span class="calendar-new-tab">(opens a new tab)</span></a>`;

  return `<div class="calendar-help" data-calendar-help>
    <p class="calendar-intro">Choose the calendar you use. We will guide you through adding this meeting.</p>
    <div class="calendar-meeting">
      <strong>${escape(event.title)}</strong>
      <dl><div><dt>When</dt><dd>${escape(labels.date)}<br><b>${escape(labels.start)} AEST</b> <span>(Brisbane time)</span></dd></div><div><dt>Where</dt><dd>${escape(event.location)}</dd></div><div><dt>Finish</dt><dd>${escape(labels.end)}${event.durationConfirmed === false ? ' · estimate only' : ''}</dd></div></dl>
      ${estimate ? `<p>${escape(estimate)}</p>` : ''}
    </div>
    <div class="calendar-provider-choices">
      <a class="button calendar-google-button" href="${escape(google.href)}" target="_blank" rel="noopener noreferrer">Use Google Calendar </a>
      <button class="button outline" type="button" data-calendar-provider="outlook">Use Outlook</button>
    </div>
    <p class="calendar-next-step"><strong>Google Calendar:</strong> a new tab opens with the meeting filled in. Sign in if asked, check the date and time, then choose <strong>Save</strong>. Choose your own reminder before saving.</p>
    <p class="calendar-copy-note">This adds one meeting to your calendar. Later changes need to be updated in your copy.</p>

    <details class="calendar-fallback" data-calendar-fallback>
      <summary>Apple Calendar or another calendar app</summary>
      <div class="calendar-fallback-content">
        <p>A calendar file carries the meeting details into your calendar. Saving the file is the first step; the steps below show you how to add it.</p>
        <p class="calendar-already-saved">Already downloaded the meeting file? Start at step 2.</p>
        <label class="calendar-app-choice">Which calendar do you use?<select data-calendar-file-provider><option value="apple">Apple Calendar on a Mac</option><option value="outlook">Outlook</option><option value="google">Google Calendar on a computer</option><option value="other">Another calendar app</option></select></label>

        <section class="calendar-import-guide" data-calendar-guide="apple">
          <h3 tabindex="-1">Apple Calendar on a Mac</h3>
          <ol><li>Save the meeting file with the button below. It normally appears in your <strong>Downloads</strong> folder.</li><li>Open the <strong>Calendar</strong> app. Choose <strong>File</strong>, then <strong>Import</strong>, and select the meeting file.</li><li>Pick the calendar you want to use, confirm the import and check that the meeting appears at <strong>${escape(labels.start)} Brisbane time</strong>.</li></ol>
          ${download}
          ${official(HELP.apple, 'See Apple’s illustrated instructions')}
        </section>

        <section class="calendar-import-guide" data-calendar-guide="outlook" hidden>
          <h3 tabindex="-1">Outlook, step by step</h3>
          <ol><li>Save the meeting file with button 1 below. Look for it in your <strong>Downloads</strong> folder.</li><li>Use button 2 to open <strong>Outlook Calendar</strong> in a new tab. Sign in to your Microsoft account if asked.</li><li>In Outlook, choose <strong>Add calendar</strong>, then <strong>Upload from file</strong>. Browse to Downloads and select the meeting file.</li><li>Choose the calendar to add it to, then select <strong>Import</strong>. Check that the meeting appears at <strong>${escape(labels.start)} Brisbane time</strong>.</li></ol>
          <div class="calendar-file-actions">${download}<a class="button outline" href="https://outlook.live.com/calendar/" target="_blank" rel="noopener noreferrer">2. Open Outlook Calendar</a></div>
          ${official(HELP.outlook, 'See Microsoft’s illustrated instructions')}
        </section>

        <section class="calendar-import-guide" data-calendar-guide="google" hidden>
          <h3 tabindex="-1">Import a file into Google Calendar</h3>
          <p>The Google Calendar button above is the easier option. File import is available on a computer.</p>
          <ol><li>Save the meeting file with button 1 below.</li><li>Use button 2 to open Google Calendar. Open <strong>Settings</strong> and choose <strong>Import &amp; export</strong>.</li><li>Select the meeting file from Downloads, choose your calendar and select <strong>Import</strong>. Check the meeting’s date and time.</li></ol>
          <div class="calendar-file-actions">${download}<a class="button outline" href="https://calendar.google.com/" target="_blank" rel="noopener noreferrer">2. Open Google Calendar</a></div>
          ${official(HELP.google, 'See Google’s illustrated instructions')}
        </section>

        <section class="calendar-import-guide" data-calendar-guide="other" hidden>
          <h3 tabindex="-1">Use another calendar app</h3>
          <ol><li>Save the meeting file with the button below.</li><li>Open your calendar app and look for <strong>Import</strong> or <strong>Open calendar file</strong>. Select the meeting file from Downloads.</li><li>Review the meeting details and confirm the import. Check your calendar to make sure it appears.</li></ol>
          ${download}<p>If your app cannot open the file, you can copy the meeting details below and create the meeting yourself.</p>
        </section>
        <p class="calendar-download-status" data-calendar-download-status role="status"></p>
      </div>
    </details>

    <details class="calendar-copy-details"><summary>Copy the meeting details instead</summary><div><p>Use these details to add the meeting yourself or keep a note.</p><label for="calendar-meeting-details">Meeting details<textarea id="calendar-meeting-details" readonly rows="7">${escape(details)}</textarea></label><button type="button" class="button outline" data-calendar-copy>Copy meeting details</button><p role="status" data-calendar-copy-status></p></div></details>
    <p class="calendar-demo-note"><strong>Demo:</strong> the club website is still being built. These choices help you save this date in your own calendar. Automatic updates are still being developed.</p>
  </div>`;
}

export function setupCalendarHelp(showDialog, getEvents = () => []) {
  function chooseProvider(container, provider) {
    const fallback = container.querySelector('[data-calendar-fallback]');
    fallback.open = true;
    const choice = container.querySelector('[data-calendar-file-provider]');
    choice.value = provider;
    container.querySelectorAll('[data-calendar-guide]').forEach((guide) => { guide.hidden = guide.dataset.calendarGuide !== provider; });
    const heading = container.querySelector(`[data-calendar-guide="${provider}"] h3`);
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const anchor = target?.closest('a[href]');
    if (anchor && !anchor.hasAttribute('data-raw-calendar')) {
      try {
        const url = new URL(anchor.href, window.location.href);
        if (/^https?:$/.test(url.protocol) && /\.ics$/i.test(url.pathname)) {
          const selected=pickEvent(getEvents(),url);
          if(selected){event.preventDefault();showDialog('Add the meeting to your calendar', chooser(selected));return;}
        }
      } catch { /* Unrelated or invalid links retain their normal behaviour. */ }
    }

    const container = target?.closest('[data-calendar-help]');
    if (!container) return;
    const provider = target.closest('[data-calendar-provider]');
    if (provider) { chooseProvider(container, provider.dataset.calendarProvider); return; }
    if (target.closest('[data-calendar-download]')) container.querySelector('[data-calendar-download-status]').textContent = 'When the download finishes, find the meeting file in Downloads. Then continue with step 2 above.';
    const copy = target.closest('[data-calendar-copy]');
    if (!copy) return;
    const text = container.querySelector('#calendar-meeting-details');
    const status = container.querySelector('[data-calendar-copy-status]');
    const selectForCopy = () => { text.focus(); text.select(); status.textContent = 'The details are selected. Use your device’s Copy command, then paste them into your calendar or notes.'; };
    if (!navigator.clipboard?.writeText) { selectForCopy(); return; }
    navigator.clipboard.writeText(text.value).then(() => { status.textContent = 'Meeting details copied. You can now paste them into your calendar or notes.'; }, selectForCopy);
  }, true);

  document.addEventListener('change', (event) => {
    if (!(event.target instanceof Element) || !event.target.matches('[data-calendar-file-provider]')) return;
    const container = event.target.closest('[data-calendar-help]');
    if (container) chooseProvider(container, event.target.value);
  });
}
