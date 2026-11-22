import {knotPhotoHtml} from './knot-photos.js';

const grog = 'https://www.animatedknots.com/';
const demonstrations = {
  uni: ['C46GvHQIuEk','Take Me Fishing'],
  palomar: ['_fF2aSQsevg','FishUSA'],
  'improved-clinch': ['fXWRZe784QU','Take Me Fishing'],
  'double-uni': ['t5a-O1gc5NY','Daiwa Australia'],
  fg: ['LUiWtd8_FJg','Paul Worsteling, Club Marine'],
  'non-slip-loop': ['C0u5HQBiv_I','Salt Strong'],
  'surgeons-join': ['yftA2kvFERU','Take Me Fishing'],
  'surgeons-loop': ['8o61cjnPKXI','Dieter Melhorn Fishing'],
  arbor: ['2UPtjqJX-zo','Salt Strong'],
};
const tasks = {
  terminal: 'Tie on a hook, swivel or lure', join: 'Join two fishing lines',
  loop: 'Make a loop or side branch', spool: 'Start a reel spool',
};
const quickChoices = `
  <section class="kg-choice" aria-labelledby="knot-choices-title">
    <h3 id="knot-choices-title">Which knot should I tie?</h3>
    <p>Our picks for a simple start. Choose one to see the steps.</p>
    <div class="kg-picks">
      <button type="button" data-knot-pick="uni"><strong>Mono to a hook or swivel</strong><span>Try the uni. One pass through the eye and five turns.</span></button>
      <button type="button" data-knot-pick="palomar"><strong>Braid to a swivel or small lure</strong><span>Try the Palomar. The whole swivel or lure fits through one loop.</span></button>
      <button type="button" data-knot-pick="double-uni"><strong>Braid to a leader</strong><span>Try the double uni. Tie the same knot on each side and slide them together.</span></button>
    </div>
    <details class="kg-results"><summary>Which knots won the strength tests?</summary>
      <p>Sport Fishing tested three samples of each entry on the International Game Fish Association’s pulling machine. A score of 90% means the knot held nine tenths of the measured strength of the bare main line. The spool label can be quite different.</p>
      <h4>Line tied straight to a swivel</h4>
      <dl>
        <dt>20 lb nylon mono</dt><dd>The AG chain reached <strong>100%</strong>. A five-turn uni came second at <strong>99.26%</strong>. The uni is our pick for learning. The mono was tested dry.</dd>
        <dt>20 lb braid</dt><dd>A two-loop Palomar won the single-line class at <strong>79.08%</strong>. Our photo lesson teaches the simpler, one-loop version. A separate Bimini double-line entry reached about <strong>87%</strong>.</dd>
      </dl>
      <a href="https://www.sportfishingmag.com/best-fishing-knots-main-line-to-terminal-gear/" target="_blank" rel="noopener noreferrer">See the swivel contest and winning ties</a>
      <h4>Braid joined to a fluorocarbon leader</h4>
      <dl>
        <dt>15 lb braid and 30 lb leader</dt><dd>The PR bobbin led at <strong>84.3%</strong>, followed by the improved FG at <strong>80.9%</strong> and the standard FG at <strong>73.4%</strong>. The PR needs a bobbin tool.</dd>
        <dt>50 lb braid and 80 lb leader</dt><dd>The winning GT reached <strong>100%</strong> and the PR bobbin reached <strong>99.5%</strong>. Changing the line or how the knot is seated can change the result.</dd>
      </dl>
      <button class="kg-fg" type="button" data-knot-pick="fg">Learn the standard FG join</button>
      <a href="https://www.sportfishingmag.com/strongest-fishing-knots-braid-to-leader/" target="_blank" rel="noopener noreferrer">See the leader contest and winning ties</a>
    </details>
    <details class="kg-recall"><summary>Know the moves, forgotten the name?</summary>
      <p>Try the move that feels familiar. Then compare the whole tie with the pictures.</p>
      <details name="knot-memory"><summary>I wind around the line and tuck the end beside the hook.</summary>
        <p>If the line goes through the eye once and you finish with that single tuck, compare the <strong>plain clinch</strong>, also called a half blood knot. <a href="https://www.netknots.com/fishing_knots/clinch-knot" target="_blank" rel="noopener noreferrer">Watch the plain clinch</a>.</p>
      </details>
      <details name="knot-memory"><summary>I tuck it beside the hook, then back through a bigger loop.</summary>
        <p>That final tuck points to an <strong>improved clinch</strong>, often called a <strong>locked half blood</strong>. Tasmania’s Inland Fisheries Service calls it a locked blood knot. <a href="https://www.ifs.tas.gov.au/media/publications/Lets_go_trout_fishing_Booklet_2022_WEB.pdf" target="_blank" rel="noopener noreferrer">See the Tasmanian drawing (PDF)</a>.</p>
        <button class="kg-fg" type="button" data-knot-pick="improved-clinch">Try the improved clinch lesson</button>
      </details>
      <details name="knot-memory"><summary>I go through the hook eye twice before I wind the line.</summary>
        <p>If both passes go the same way and the loose end comes back through both small loops at the eye, compare the <strong>Trilene</strong>. <a href="https://www.berkley-fishing.com/blogs/news/fishing-knots-101" target="_blank" rel="noopener noreferrer">See Berkley’s Trilene instructions</a>.</p>
      </details>
      <details name="knot-memory"><summary>I double the line through the eye and pass the whole hook through a loop.</summary>
        <p>Compare the <strong>Palomar</strong>. Fold the line through the eye, or thread it through and back. Tie a loose overhand knot in those doubled strands. The giveaway is slipping the big loop over the whole hook, swivel or lure before tightening.</p>
        <button class="kg-fg" type="button" data-knot-pick="palomar">Compare the four Palomar photos</button>
      </details>
      <details name="knot-memory"><summary>I wind inside a loop, then slide the knot down to the hook.</summary>
        <p>Look at the <strong>uni</strong>. Each turn goes around both strands inside the loop. The finished coil slides to the eye.</p>
        <button class="kg-fg" type="button" data-knot-pick="uni">Try the uni lesson</button>
      </details>
      <details name="knot-memory"><summary>I join two lines and the loose ends come out opposite ways.</summary>
        <p>If each end wraps around the other line and returns through the same middle gap from opposite sides, compare the <strong>blood knot</strong>. <a href="https://www.animatedknots.com/blood-knot" target="_blank" rel="noopener noreferrer">Watch the blood knot join</a>.</p>
      </details>
      <p>Names vary. Ern Grant’s Queensland guide calls the extra-tuck finish a “clinch”, so check where the loose end goes. <a href="https://www.fishingcairns.com.au/tackle-rigs-bait/fishing-knots/" target="_blank" rel="noopener noreferrer">Compare Grant’s illustrations</a>.</p>
    </details>
  </section>`;
const knots = {
  uni: {
    name: 'Uni knot', task: 'terminal', use: 'A good first knot for tying mono leader to the eye of a swivel or hook.',
    kit: 'Mono line, a swivel with a clear eye, water and clippers. Practise on the swivel first.',
    steps: [
      ['Thread the eye','Leave about a handspan of spare line through the swivel. Fold that end back beside the line to the rod.'],
      ['Make a loop beside the line','Curve the loose end back over the two strands. Pinch the crossing so the loop stays open.'],
      ['Wind inside the loop','Pass the loose end through the loop and around both strands five times for this mono example. Keep the turns beside each other.'],
      ['Slide it down','Wet the turns. Draw on the loose end to form a neat barrel, then pull the long line to slide it down to the swivel. Test before trimming.'],
    ],
    check: 'The barrel of turns should sit tight against the eye. If the turns overlap or slide when pulled, cut it off and tie another.',
    url: grog+'uni-knot',
  },
  'improved-clinch': {
    name: 'Improved clinch knot', task: 'terminal', use: 'Fasten light mono to a hook or swivel. For very slick braid, choose a Palomar instead.',
    kit: 'Light mono, swivel, water and clippers.',
    steps: [
      ['Leave a working end','Pass the line through the swivel eye and hold the swivel.'],
      ['Make five wraps','Wind the loose end around the long line about five times, keeping a little opening just above the eye.'],
      ['Return through two openings','Bring the loose end through the small opening by the eye. Then take it back through the new large loop you just made.'],
      ['Seat and inspect','Wet the line. Pull the long line steadily while guiding the coils down to the eye. Test, then trim the spare end.'],
    ],
    check: 'Look for one tidy stack of coils and a trapped tag. Skipping the return through the large loop makes a different knot.',
    url: grog+'improved-clinch-knot',
  },
  palomar: {
    name: 'Palomar knot', task: 'terminal', use: 'Attach braid or mono to an eye when the whole hook, swivel or lure can fit through a loop.',
    kit: 'Braid or mono, a swivel for practice and clippers. Leave a larger loop for a larger lure.',
    steps: [
      ['Double the line through the eye','Pass the end through the eye and back again to make a big loop on one side. If the eye is large enough, you can fold the line first and pass the fold through.'],
      ['Make a loose overhand knot','Treat the doubled line as one piece. Tie one loose overhand knot around the doubled standing part with the swivel hanging below.'],
      ['Pass the loop over the swivel','Open the folded loop and bring it over the entire swivel or hook. Slide it up past the eye.'],
      ['Wet and draw it tight','Moisten the turns and draw the long line and loose end together until the knot sits at the eye. Test before trimming.'],
    ],
    check: 'Both strands should sit smoothly in the eye. A loop trapped on the swivel body or the bend of a hook needs resetting.',
    url: 'https://www.tackletactics.com.au/blogs/learn-to-fish/palomar-knot', source:'See the full photo sequence from Tackle Tactics',
  },
  'double-uni': {
    name: 'Double uni knot', task: 'join', use: 'Join a main line to a leader using two uni knots that slide together.',
    kit: 'Two differently coloured lines for practice. On the rod, use the same line and leader you intend to fish.',
    steps: [
      ['Overlap the two lines','Lay the ends beside each other, pointing in opposite directions, with enough spare line to make a loop on each side.'],
      ['Tie the first barrel','Turn the mono end back to make a loop. Wrap it through that loop around both lines about five times. Wet it and snug the little barrel.'],
      ['Repeat from the other side','Form a second uni with the other end around both lines. Smooth thin braid needs more wraps than mono. Follow the Daiwa demonstration for your braid.'],
      ['Bring both knots together','Hold one long line in each hand and draw them apart. The barrels should meet in the middle. Test before you cut either tag.'],
    ],
    check: 'Pull on the two long lines. The barrels should stay against one another. If one creeps, retie and check the wraps on that side.',
    url: 'https://daiwafishing.com.au/blogs/news/how-to-tie-a-double-uni-knot', source: 'Watch Daiwa Australia tie the double uni',
  },
  fg: {
    name: 'FG knot', task: 'join', use: 'A slim join for thin braid and a thicker mono or fluorocarbon leader that will pass through the rod guides.',
    kit: 'Braid, a thicker leader, clippers and a knot puller or smooth protected grips. This is the most involved join here.',
    steps: [
      ['Put the braid under tension','Keep the braid taut and place the leader across it. Follow the close-up in the video to see which strand crosses first.'],
      ['Build the alternating wraps','Work the braid around the leader from alternating sides. Firm each crossing as you go. Paul Worsteling’s demonstration uses 27 crossings.'],
      ['Lock the braid onto the leader','Use the braid tag to make a half hitch around both lines. Pull the standing braid and leader firmly apart using smooth grips. The weave must grip before trimming.'],
      ['Finish and check both ends','Follow the video through the alternating half hitches and locking finish. Test the finished join, then trim the tags without cutting the load-bearing strands.'],
    ],
    check: 'The weave should stay in place when the braid and leader are pulled apart. A bunching or sliding weave needs retying.',
    url: 'https://www.clubmarine.com.au/explore-boating/videos/how-to-tie-an-fg-knot.html', source: 'Watch Paul Worsteling tie and finish the FG',
  },
  'non-slip-loop': {
    name: 'Non-slip lure loop (Kreh loop)', task: 'loop', use: 'Leave a small fixed loop at a lure’s nose so it can pivot freely.',
    kit: 'Mono or fluorocarbon leader, a lure with a nose eye or a swivel to practise on, water and clippers.',
    steps: [
      ['Make a loose overhand knot','Leave a handspan of loose end. Keep the overhand knot open and pass the loose end through the lure eye.'],
      ['Return through the knot','Take the loose end back into the overhand knot from the side it came out of. Set the gap you want at the lure.'],
      ['Wind and return','Wind the end around the long line about five times for light mono. Return through the same side of the overhand knot that the end last came out of.'],
      ['Set the loop size','Wet the line. Draw the turns together gradually while keeping the loop small enough that the lure cannot catch in it. Test and trim.'],
    ],
    check: 'The knot should hold its shape and leave a small open loop. The eye should move freely when you tip the lure.',
    url: grog+'non-slip-mono-knot',
  },
  'dropper-loop': {
    name: 'Dropper loop', task: 'loop', use: 'Make a side branch partway along a trace, as on a paternoster rig with the sinker below.',
    kit: 'A length of mono trace and a generous loop of spare line where the branch belongs.',
    steps: [
      ['Cross the middle of the trace','Make a generous loop at the spot where you want the side branch. Hold the crossing between finger and thumb.'],
      ['Twist at the crossing','Turn the loop around the crossover about six times. Leave a small gap in the middle of the twists.'],
      ['Bring the loop through','Push the far side of the large loop through that central gap. Pinch the emerging loop so it cannot go back.'],
      ['Draw the two ends apart','Wet the turns. Hold the projecting loop while drawing both ends of the trace away from each other.'],
    ],
    check: 'There should be a fixed loop sticking out between two sets of turns. Keep the branch short enough to clear the sinker.',
    url: grog+'dropper-loop-knot',
  },
  snell: {
    name: 'Snell knot', task: 'terminal', use: 'Bind leader directly to the shank of an eyed single hook. The leader should pull in line with the shank.',
    kit: 'Mono leader, an eyed single hook with enough clear shank for wraps, water and clippers. Cover the hook point for practice.',
    steps: [
      ['Pass through the eye twice','Pass the leader end through the eye. Leave a large loop, then pass the end through the eye again from the same direction.'],
      ['Hold the eye and strands','Pinch firmly close to the eye. Arrange the loop alongside the shank with room to wrap it.'],
      ['Wrap down the shank','Wind the loop around the shank and the line lying beside it seven or eight times. Hold the turns side by side.'],
      ['Close and seat the wraps','Pull the long leader to take up the loop. Wet the turns and tighten both ends while guiding the wraps under the eye.'],
    ],
    check: 'The wraps should grip the shank in a tidy row. Look for the leader leaving through the eye without a crossed or loose turn.',
    url: grog+'snell-knot',
  },
  'surgeons-join': {
    name: 'Double surgeon’s join', task: 'join', use: 'A quick way to join two short lengths of mono or add a manageable leader.',
    kit: 'Two pieces of mono, water and clippers. You need to pass the full short leader through the loop.',
    steps: [
      ['Overlap the ends','Lay the ends beside each other pointing opposite ways. Allow enough overlap for an open loop.'],
      ['Make a shared loop','Use both strands together to form an overhand loop. Pass the short leader and the other line’s tag through together.'],
      ['Make a second pass','Take those same two pieces through the loop once more in the same direction. Keep the turns even.'],
      ['Set all four strands','Wet the knot. Draw all four strands out evenly until it seats. Test the two long lines before trimming both tags.'],
    ],
    check: 'Pull on the standing lines in opposite directions. If one tag draws inside or the knot twists into a loose pile, retie.',
    url: grog+'surgeons-join-knot',
  },
  'surgeons-loop': {
    name: 'Surgeon’s end loop', task: 'loop', use: 'Make a fixed loop at the end of a mono trace to change a sinker or join a looped rig.',
    kit: 'Mono line, water and clippers. Size the loop for what you intend to pass through it.',
    steps: [
      ['Double the end','Fold the end back, leaving enough doubled line for the loop you need.'],
      ['Tie with the doubled line','Using the fold like one working end, make a loose overhand knot.'],
      ['Pass the fold through again','Bring the same fold through the overhand loop a second time. Keep the doubled strands flat.'],
      ['Set the size and tighten','Set the loop length, moisten, then draw the loop and both lines apart. Check before trimming the tag.'],
    ],
    check: 'The loop should stay the same size when pulled. Try the sinker through the loop before cutting the spare end.',
    url: grog+'surgeons-loop-knot',
  },
  arbor: {
    name: 'Arbor knot', task: 'spool', use: 'Fasten the first layer of mono backing to an empty reel spool before winding on line.',
    kit: 'Empty reel spool, mono backing and clippers. For braid, follow the reel maker’s advice on backing or a braid-ready spool.',
    steps: [
      ['Go round the spool','With the line routed correctly through the reel, wrap its end once around the bare centre of the spool.'],
      ['Tie a sliding knot','Use the loose end to tie an ordinary overhand knot around the long line. It should still slide.'],
      ['Add a stopper','Tie a second small overhand knot in the loose end itself. Tighten this stopper.'],
      ['Snug it against the spool','Pull the long line until the first knot slides down and the stopper jams against it. Trim and begin winding evenly.'],
    ],
    check: 'The backing should take up on the spool when you wind. This knot anchors the first wraps only. Keep enough line on the reel when fishing.',
    url: grog+'arbor-knot',
  },
};

function mount(host) {
  return host?.matches('#guide-knots') ? host : host?.querySelector('#guide-knots') || host;
}

function displayLesson(view, id, index) {
  const knot = knots[id];
  const video = demonstrations[id];
  const player = video ? '<div class="kg-video" data-knot-player><button type="button" data-knot-play><span class="kg-play-icon" aria-hidden="true">▶</span><strong>Play the '+knot.name.toLowerCase()+' video</strong><small>'+video[1]+' on YouTube</small></button></div>' : '';
  const media = id==='palomar' ? player+'<a class="kg-watch-source" href="https://www.youtube.com/watch?v=_fF2aSQsevg" target="_blank" rel="noopener noreferrer">Watch directly on YouTube</a><div class="kg-photo"></div>' : '<div class="kg-photo"></div>'+player;
  const linkText = knot.source || 'Watch the step-by-step animation';
  view.innerHTML = '<div class="kg-intro"><h3>'+knot.name+'</h3><p>'+knot.use+'</p></div>'+
    '<div class="kg-kit"><h4>What you need</h4><p>'+knot.kit+'</p></div>'+
    '<div class="kg-work"><div class="kg-media">'+media+'</div>'+
    '<div class="kg-step"><p class="kg-count"></p><h4></h4><p data-knot-instruction></p>'+
    '<div class="kg-buttons"><button type="button" data-knot-back>Previous step</button><button type="button" data-knot-next>Next step</button></div>'+
    '<a class="kg-watch" href="'+knot.url+'" target="_blank" rel="noopener noreferrer">'+linkText+'</a></div></div>'+
    '<aside class="kg-check"><h4>Check your knot</h4><p>'+knot.check+'</p></aside>'+
    (id==='palomar'?'<dialog class="kg-enlarged" aria-labelledby="kg-enlarged-title"><div><h3 id="kg-enlarged-title">Palomar knot</h3><button type="button" data-knot-close>Close photo</button></div><img alt=""><p></p></dialog>':'');
  displayStep(view,id,index);
}

function displayStep(view,id,index) {
  const knot = knots[id];
  const [label,detail] = knot.steps[index];
  view.querySelector('.kg-photo').innerHTML = knotPhotoHtml(id,index);
  view.querySelector('.kg-count').textContent = 'Step '+(index+1)+' of '+knot.steps.length;
  view.querySelector('.kg-step h4').textContent = label;
  view.querySelector('[data-knot-instruction]').textContent = detail;
  view.querySelector('[data-knot-back]').disabled = index===0;
  view.querySelector('[data-knot-next]').disabled = index===knot.steps.length-1;
}

export function setupKnotsGuide(host, knotId='') {
  const target = mount(host);
  if (!target) return;
  if (target.querySelector('[data-knot-select]')) {
    if (knotId) selectWorkshopKnot(target,knotId);
    return;
  }
  target.innerHTML = '<div class="guide-chapter-title"><div><h2 id="guide-knots-title">Fishing knots</h2><p>Grab a swivel and some spare line to try a knot before tying it on your rod.</p></div></div>'+quickChoices+
    '<div class="kg-selects"><label>What are you tying?<select data-knot-task><option value="">All knot jobs</option>'+
    Object.entries(tasks).map(([id,label])=>'<option value="'+id+'">'+label+'</option>').join('')+'</select></label>'+
    '<label>Choose a knot<select data-knot-select></select></label></div>'+
    '<article class="kg-card" data-knot-lesson></article><p class="kg-sr" data-knot-status aria-live="polite"></p>'+
    '<details class="kg-help"><summary>Which end is which?</summary><p>The <strong>tag end</strong> is the short, loose end in your hand. The <strong>standing line</strong> is the long part going back to the reel. A <strong>bight</strong> is a fold in the line.</p><p>For a pull test, use a swivel or smooth grip and keep hooks clear of your hands. Use clippers to cut line.</p></details>';
  const task = target.querySelector('[data-knot-task]');
  const chooser = target.querySelector('[data-knot-select]');
  const lesson = target.querySelector('[data-knot-lesson]');
  const status = target.querySelector('[data-knot-status]');
  let step = 0;

  function render(updateAddress) {
    const id = chooser.value;
    step = 0;
    displayLesson(lesson,id,step);
    status.textContent = knots[id].name+', step 1 of '+knots[id].steps.length;
    if (updateAddress && location.hash.split('?')[0]==='#guide/knots') {
      const hash = '#guide/knots?knot='+id;
      if (location.hash!==hash) history.replaceState(history.state,'',hash);
    }
  }
  function menu(id, updateAddress) {
    const choices = Object.entries(knots).filter(([,knot])=>!task.value || knot.task===task.value);
    chooser.replaceChildren(...choices.map(([key,knot])=>new Option(knot.name,key)));
    if (choices.some(([key])=>key===id)) chooser.value=id;
    render(updateAddress);
  }
  task.addEventListener('change',()=>menu(chooser.value,true));
  chooser.addEventListener('change',()=>render(true));
  target.querySelector('.kg-choice').addEventListener('click',event=>{
    const pick = event.target.closest('[data-knot-pick]');
    if (!pick) return;
    const id = pick.dataset.knotPick;
    task.value = knots[id].task;
    menu(id,true);
    const heading = lesson.querySelector('h3');
    heading.tabIndex = -1;
    heading.focus({preventScroll:true});
    heading.scrollIntoView({block:'center'});
  });
  target.addEventListener('plfc-select-knot',event=>{
    const id=event.detail;
    if (!Object.hasOwn(knots,id)) return;
    if (task.value && knots[id].task!==task.value) task.value='';
    menu(id,false);
  });
  lesson.addEventListener('click',event=>{
    const enlarge = event.target.closest('[data-knot-enlarge]');
    if (enlarge) {
      const src = enlarge.querySelector('img');
      const dialog = lesson.querySelector('.kg-enlarged');
      const photo = dialog.querySelector('img');
      photo.src = src.currentSrc || src.src;
      photo.alt = src.alt;
      dialog.querySelector('h3').textContent = 'Palomar knot · Step '+(step+1);
      dialog.querySelector('p').textContent = src.alt;
      dialog.addEventListener('close',()=>{
        if (enlarge.isConnected) enlarge.focus({preventScroll:true});
      },{once:true});
      dialog.showModal();
      return;
    }
    if (event.target.closest('[data-knot-close]') || event.target.matches('.kg-enlarged')) {
      lesson.querySelector('.kg-enlarged').close();
      return;
    }
    if (event.target.closest('[data-knot-play]')) {
      const iframe = document.createElement('iframe');
      iframe.title = knots[chooser.value].name+' tying demonstration';
      iframe.src = 'https://www.youtube-nocookie.com/embed/'+demonstrations[chooser.value][0]+'?playsinline=1&autoplay=1';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      lesson.querySelector('[data-knot-player]').replaceChildren(iframe);
      return;
    }
    const button = event.target.closest('[data-knot-back],[data-knot-next]');
    if (!button || button.disabled) return;
    const next = button.hasAttribute('data-knot-next');
    step += next ? 1 : -1;
    const knot = knots[chooser.value];
    displayStep(lesson,chooser.value,step);
    status.textContent = 'Step '+(step+1)+' of '+knot.steps.length+'. '+knot.steps[step][0]+'. '+knot.steps[step][1];
    const same = lesson.querySelector(next?'[data-knot-next]':'[data-knot-back]');
    (same.disabled ? lesson.querySelector('button:enabled') : same).focus({preventScroll:true});
  });
  menu(Object.hasOwn(knots,knotId)?knotId:'uni',false);
}

export function selectWorkshopKnot(host, id) {
  const target = mount(host);
  if (!target || !Object.hasOwn(knots,id)) return false;
  if (!target.querySelector('[data-knot-select]')) { setupKnotsGuide(target,id); return true; }
  target.dispatchEvent(new CustomEvent('plfc-select-knot',{detail:id}));
  return true;
}
