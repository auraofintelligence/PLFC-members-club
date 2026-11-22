const links = {
  island: 'https://www.wildcare.org.au/i-live-in-another-seq-region/',
  strandings: 'https://www.qld.gov.au/environment/plants-animals/wildlife/marine-strandings/what-you-can-do',
  sharkGear: 'https://www.dpi.qld.gov.au/initiatives/sharksmart/equipment/entangled-animals',
  bird: 'https://www.dpird.nsw.gov.au/dpi/fishing/recreational-fishing/responsible-fishing/wildlife-injuries/minimising-interactions-with-seabirds',
  dolphin: 'https://www.detsi.qld.gov.au/our-department/news-media/mediareleases/2023/entangled-dolphin-rescued-returned-to-reef-home',
  localApp: 'https://wildlife-rescue-minjerribah.auraofintelligence.workers.dev/',
};

function reference(url, label) {
  return `<a href="${url}" target="_blank" rel="noopener">${label}</a>`;
}

function phone(service, number, dial, instruction = '') {
  return `<div class="wildlife-number"><strong>${service}</strong><span>${number}${instruction ? ' · ' + instruction : ''}</span></div>
    <details class="wildlife-call"><summary>Call for a real incident</summary>
      <p>This opens your phone dialler. If you’re exploring the demo, leave the number on screen.</p>
      <a class="button small" href="tel:${dial}" aria-label="Dial ${service}, ${number}">Dial ${number}</a>
    </details>`;
}

function wildlifeSongHtml() {
  return `<section class="rescue-song" aria-label="Be The Legend, wildlife rescue song">
    <div class="song-phone">
      <div class="song-screen">
        <button type="button" class="song-poster" data-play-rescue-song aria-label="Play Be The Legend by i C. Infinity">
          <img src="/assets/care/be-the-legend.jpg?v=cover" alt="" width="1080" height="1920" loading="lazy">
          <span>Play song</span>
        </button>
      </div>
    </div>
    <div class="song-caption"><p class="eyebrow">STRADDIE FUN</p>
      <h3>Be The Legend</h3>
      <p>i C. Infinity’s island reminder to ring a rescuer when you see injured wildlife.</p>
      <p>Tap the picture to play. Use the player controls for sound or a bigger view.</p>
      <a href="https://youtu.be/8yw-2ljAClE" target="_blank" rel="noopener">Watch on YouTube</a>
    </div>
  </section>`;
}

function wildlifeCard() {
  return `<div class="wildlife-help">
    <p class="wildlife-intro">Stay where you are safe. Choose the animal or equipment below. A rescuer will guide you through the next step.</p>
    <div class="wildlife-app-entry"><img src="/assets/care/wildlife-rescue-logo.webp" width="54" height="54" alt=""><div><a href="${links.localApp}" target="_blank" rel="noopener">Open Wildlife Rescue Minjerribah app</a><p>Explore the island map. For a real rescue, phone the contacts below.</p></div></div>
    <div class="wildlife-cases">
      <section class="wildlife-case">
        <img src="/assets/care/bird.webp" width="320" height="144" alt="Two pied cormorants resting on a wreck">
        <div><h3>A seabird is hooked or tangled</h3>
          <p>Stop casting. If the bird is still on your line, avoid pulling against it or cutting it loose with line trailing. Keep dogs and onlookers back. Ask a mate to call while you keep the bird in sight.</p>
          ${phone('Wildlife Rescue Minjerribah', '0448 466 556', '0448466556', '24 hours')}
        </div>
      </section>
      <section class="wildlife-case">
        <img src="/assets/care/dolphin.webp" width="320" height="144" alt="Bottlenose dolphins at Amity Point on Minjerribah">
        <div><h3>A dolphin, turtle or other marine animal is in trouble</h3>
          <p>For a sick, injured or stranded dolphin, whale, dugong, seal or marine turtle, give it space. Keep people and dogs away. Leave refloating and untangling to trained responders.</p>
          ${phone('Queensland marine strandings', '1300 130 372', '1300130372', 'Press 1')}
        </div>
      </section>
    </div>
    <section class="wildlife-gear"><h3>Animal caught in a shark net or drumline?</h3>
      <p>Stay clear of the equipment. From a safe place, note the closest beach and any buoy number you can already see.</p>
      ${phone('Queensland Shark Control Program', '1800 806 891', '1800806891')}
    </section>
    <details class="wildlife-extra"><summary>What should I tell the rescuer?</summary>
      <p>Give the nearest beach access, jetty or landmark, the time, what animal you see and what appears wrong. If it is moving, describe its direction. Give a location pin or photo only if you already have one or can get it safely.</p>
    </details>
    <details class="wildlife-extra"><summary>Keep hooks away from seabirds and dolphins</summary>
      <p>Around Amity Point and elsewhere on the island, wind in your lines when a dolphin approaches. Wait for it to leave before casting. Give it room, let it find its own food and keep fish, scraps and bait out of reach.</p>
      <p>Before every cast, check above and behind you for birds. If birds dive on the bait, pause or move. Collect broken line and cover spare hooks before packing up.</p>
      <p>${reference(links.dolphin, 'Queensland dolphin advice')} · ${reference(links.bird, 'Fisheries seabird advice')}</p>
    </details>
    <details class="wildlife-extra"><summary>Where the rescue numbers come from</summary>
      <p>Numbers checked 20 November 2026. ${reference(links.island, 'Wildcare island directory')} · ${reference(links.strandings, 'Queensland marine strandings')} · ${reference(links.sharkGear, 'Queensland Shark Control Program')}</p>
    </details>
    ${wildlifeSongHtml()}
    <details class="wildlife-extra" data-wildlife-credits><summary>Photo and music credits</summary>
      <p>“Pied Cormorants Resting On Wrecks” by ${reference('https://commons.wikimedia.org/wiki/File:Pied_Cormorants_Resting_On_Wrecks.png', 'Silverish Lily')}. Resized and converted to WebP. ${reference('https://creativecommons.org/licenses/by-sa/4.0/', 'CC BY-SA 4.0')}</p>
      <p>“Bottlenose Dolphins, Amity Point, Stradbroke Island, 2021” by ${reference('https://commons.wikimedia.org/wiki/File:Bottlenose_Dolphins,_Amity_Point,_Stradbroke_Island,_2021.jpg', 'Mark Gillow')}. Resized and converted to WebP. ${reference('https://creativecommons.org/licenses/by/2.0/', 'CC BY 2.0')}</p>
      <p>“Be The Legend: Wildlife Rescue Minjerribah” is a song from <em>Straddie Fun</em> by i C. Infinity (Luke Catalyst Nathan Hayes).</p>
    </details>
  </div>`;
}

export function getWildlifeHelpHtml() {
  return wildlifeCard();
}

export function setupWildlifeHelp(showDialog) {
  function stopSong(screen) {
    screen.querySelector('iframe')?.remove();
    screen.querySelector('.song-poster').hidden = false;
  }
  function stopPlayingSongs(container = document) {
    container.querySelectorAll('.song-screen iframe').forEach(player => stopSong(player.parentElement));
  }
  const plannerNav = document.querySelector('[data-view="fishing"] .fishing-subnav');
  plannerNav?.insertAdjacentHTML('afterend', `<aside class="planner-wildlife" aria-label="Wildlife rescue"><img src="/assets/care/wildlife-rescue-logo.webp" alt="" width="44" height="44"><a href="${links.localApp}" target="_blank" rel="noopener">Open Wildlife Rescue Minjerribah app</a><button type="button" class="text-link" data-open-wildlife-dialog aria-haspopup="dialog">Injured wildlife help</button></aside>`);
  document.addEventListener('click', event => {
    if (event.target.closest('[data-open-wildlife-dialog]')) {
      stopPlayingSongs();
      showDialog('Injured wildlife help', wildlifeCard());
    }
    const poster = event.target.closest('[data-play-rescue-song]');
    if (!poster || poster.hidden) return;
    const player = document.createElement('iframe');
    player.src = 'https://www.youtube-nocookie.com/embed/8yw-2ljAClE?playsinline=1&autoplay=1';
    player.title = 'Be The Legend, a song for Wildlife Rescue Minjerribah';
    player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    player.allowFullscreen = true;
    player.referrerPolicy = 'strict-origin-when-cross-origin';
    poster.hidden = true;
    poster.after(player);
    player.focus({preventScroll:true});
  });
  window.addEventListener('plfc:navigated', () => stopPlayingSongs());
  const dialog = document.getElementById('info-dialog');
  dialog.addEventListener('close', () => stopPlayingSongs(dialog));
}
