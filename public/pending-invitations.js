const expiry = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Brisbane', weekday: 'short', day: 'numeric', month: 'short',
  year: 'numeric', hour: 'numeric', minute: '2-digit'
});

export function privateSetupLink(result) {
  const link = new URL('/', location.origin);
  link.hash = new URLSearchParams({activate: result.token, login: result.login});
  return link.href;
}

export function setupPendingInvitations(section, {api, esc, titleFor}) {
  const output = section.querySelector('[data-pending-rows]');
  const message = section.querySelector('[data-pending-status]');
  const refresh = section.querySelector('[data-refresh-invites]');
  let entries = [];
  let revision = 0;

  function forget() {
    revision++;
    entries = [];
    output.replaceChildren();
    message.textContent = '';
    refresh.disabled = false;
  }

  async function list(focusLogin) {
    const current = ++revision;
    refresh.disabled = true;
    try {
      const result = await api('/api/accounts/invitations');
      if (current !== revision) return;
      entries = result.invitations;
      output.innerHTML = entries.map((entry, index) => {
        const title = titleFor(entry);
        return '<li class="pending-invite"><div><strong>'+esc(title)+'</strong>'+
          '<span>Username <bdi>'+esc(entry.login)+'</bdi></span><small>Expires '+esc(expiry.format(entry.expires * 1000))+' Brisbane time</small></div>'+
          '<button type="button" class="button outline small" data-invite-index="'+index+'" aria-label="'+esc((entry.canCopy?'Copy invitation for ':'Replace invitation for ')+entry.login)+'">'+
          (entry.canCopy?'Copy invitation':'Replace old link')+'</button><div class="invite-feedback" data-feedback aria-live="polite"></div></li>';
      }).join('');
      message.textContent = entries.length ? 'Copy the link for one person and send it to them privately. They open it and choose their own password.' : 'There are no pending invitations. You can create a new one below.';
      if (focusLogin) {
        const index = entries.findIndex(entry => entry.login === focusLogin.trim().toLowerCase());
        const target = output.querySelector('[data-invite-index="'+index+'"]');
        if (target) {
          target.focus({preventScroll:true});
          target.scrollIntoView({block:'center'});
        }
      }
    } catch(error) {
      if (current !== revision) return;
      output.replaceChildren();
      entries = [];
      message.textContent = error.message + ' Choose Refresh list to try again.';
    } finally {
      if (current === revision) refresh.disabled = false;
    }
  }

  refresh.onclick = () => list();
  output.addEventListener('click', async event => {
    const button = event.target.closest('button[data-invite-index]');
    if (!button) return;
    const entry = entries[Number(button.dataset.inviteIndex)];
    if (!entry) return;
    const feedback = button.closest('li').querySelector('[data-feedback]');
    if (!entry.canCopy && !window.confirm('Replace the invitation for '+entry.login+'? The old link will stop working. The expiry stays the same.')) return;
    const current = revision;
    button.disabled = true;
    feedback.textContent = 'Getting the private link…';
    try {
      const result = await api('/api/accounts/invitations', {
        method:'POST', body:JSON.stringify({action:entry.canCopy?'copy':'replace', id:entry.id})
      });
      if (current !== revision) return;
      // Replacing can give this invitation a new id. Use the list again for later copies.
      if (!entry.canCopy) {
        await list(entry.login);
        if (revision !== current + 1) return;
      }
      const index = entries.findIndex(item => item.login === entry.login);
      const row = output.querySelector('[data-invite-index="'+index+'"]')?.closest('li');
      if (!row) return;
      const note = row.querySelector('[data-feedback]');
      const url = privateSetupLink(result);
      try {
        await navigator.clipboard.writeText(url);
        note.textContent = 'Copied. Paste this link into a private message to '+entry.login+'.';
      } catch {
        note.innerHTML = '<label>Private invitation link<input readonly autocomplete="off" spellcheck="false"></label><button type="button" class="button outline small" data-copy-shown>Copy link</button><span data-copy-help></span>';
        const field = note.querySelector('input');
        field.value = url;
        field.focus();
        field.select();
        note.querySelector('button').onclick = async () => {
          try {
            await navigator.clipboard.writeText(field.value);
            note.textContent = 'Copied. Paste this link into a private message to '+entry.login+'.';
          } catch {
            field.focus();
            field.select();
            note.querySelector('[data-copy-help]').textContent = 'Use Copy on the selected link, then paste it into a private message.';
          }
        };
      }
    } catch(error) {
      feedback.textContent = error.message + ' Refresh the list for its latest status.';
      if(error.status===409){
        const help=document.createElement('a');help.href='/webmaster-help.html?from=invitation';help.textContent='Ask the Webmaster';feedback.append(' ',help);
      }
    } finally {
      button.disabled = false;
    }
  });
  return {list, forget};
}
