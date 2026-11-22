const loads = new WeakMap();

function element(tag, text, className) {
  const item = document.createElement(tag);
  if (text) item.textContent = text;
  if (className) item.className = className;
  return item;
}

function libraryDate(date) {
  const monthOnly = date.length === 7;
  return new Intl.DateTimeFormat('en-AU', {
    year: 'numeric', month: 'long', day: monthOnly ? undefined : 'numeric', timeZone: 'UTC',
  }).format(new Date((monthOnly ? date + '-01' : date) + 'T12:00:00Z'));
}

function documentCard(record) {
  const card = element('article', '', 'library-record');
  const date = libraryDate(record.sourceDate);
  const title = element('h4', record.title);
  const details = element('p', date + ' · ' + record.status, 'secondary');
  const actions = element('div', '', 'button-row');
  const view = element('a', 'Read PDF', 'button outline small');
  view.href = '/api/library/' + encodeURIComponent(record.id);
  view.target = '_blank';
  view.rel = 'noopener';
  view.setAttribute('aria-label', 'Read ' + record.title + ', ' + date + ' (opens in a new tab)');
  const save = element('a', 'Save a copy', 'text-link');
  save.href = view.getAttribute('href') + '?download=1';
  save.download = 'plfc-' + record.id + '.pdf';
  save.setAttribute('aria-label', 'Save ' + record.title + ', ' + date);
  actions.append(view, save);
  card.append(title, details, actions);
  return card;
}

export function clearLibrary(container) {
  loads.get(container)?.abort();
  loads.delete(container);
  container.replaceChildren();
}

export async function setupLibrary(container) {
  if (!container) return;
  clearLibrary(container);
  const load = new AbortController();
  loads.set(container, load);
  const heading = element('h3', 'Club document library');
  const message = element('p', 'Opening your documents…', 'secondary');
  message.setAttribute('role', 'status');
  container.append(heading, message);
  try {
    const path=container.id==='member-library'?'/api/library?view=member':'/api/library';
    const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', signal: load.signal });
    if (load.signal.aborted) return;
    if ([401, 403].includes(response.status)) {
      clearLibrary(container);
      return;
    }
    if (!response.ok) throw new Error('Library unavailable');
    const { documents } = await response.json();
    if (load.signal.aborted) return;
    message.textContent = documents.length
      ? 'Read a document in a new tab, or save a PDF to your device.'
      : 'There are no documents available to your account yet.';
    documents.forEach(record => container.append(documentCard(record)));
  } catch {
    if (load.signal.aborted) return;
    message.textContent = 'The library couldn’t load.';
    const retry = element('button', 'Try again', 'button outline small');
    retry.type = 'button';
    retry.addEventListener('click', () => setupLibrary(container), { once: true });
    container.append(retry);
  }
}
