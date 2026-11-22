import {baitfishGuideHtml} from './baitfish-guide.js';
import {baitNetsHtml} from './bait-nets.js';
import {shoreBaitHtml} from './shore-bait.js';
import {cookPipisHtml,baitPipisHtml} from './pipi-guide.js';
import {bayBaitHtml} from './bay-bait.js';

export const baitTopics = [
  {slug:'bait-nets', title:'How to use bait nets', picture:'bait/nets/cast-2', hint:'Cast, scoop or seine. See each net in action.', render:baitNetsHtml},
  {slug:'baitfish', title:'Catch and identify baitfish', picture:'fish/yellowtail-pike', hint:'Pike, mullet and other small schooling fish.', render:baitfishGuideHtml},
  {slug:'yabbies', title:'Pump saltwater yabbies', picture:'bait/shore/ghost-nipper', hint:'Find nipper holes on a sheltered sandflat.', render:()=>shoreBaitHtml('yabbies')},
  {slug:'beachworms', title:'Catch beach worms', picture:'bait/shore/beachworm', hint:'Spot the head in the wash and lift a worm by hand.', render:()=>shoreBaitHtml('beachworms')},
  {slug:'prawns', title:'Catch prawns', picture:'bait/bay/prawns', hint:'Work the shallow edge with a scoop net.', render:()=>bayBaitHtml('prawns')},
  {slug:'squid', title:'Catch squid on a jig', picture:'bait/bay/squid', hint:'See the jig, work the pause and land a squid.', render:()=>bayBaitHtml('squid')},
  {slug:'pipis', title:'Gather pipis and eugaries', picture:'bait/bay/pipis', hint:'Hand-gather eugaries on Straddie, purge them for dinner or salt them for bait.', render:()=>bayBaitHtml('pipis')},
  {slug:'pipis-cooking',title:'Get the grit out and cook pipis',picture:'bait/bay/pipi-grit',hint:'Get grit out of locally gathered live pipis, then steam and shell them.',render:cookPipisHtml,subtopic:true},
  {slug:'pipis-bait',title:'Shell and salt pipis for bait',picture:'tackle/baited-pipi',hint:'Firm the foot, pack it for the freezer and bait the hook.',render:baitPipisHtml,subtopic:true},
];

export function baitDirectoryHtml() {
  return '<p class="bait-intro">Choose a bait or a net to see what it looks like and how to get started.</p>'+
    '<nav class="guide-directory-grid bait-directory" aria-label="Choose your bait or net">'+baitTopics.filter(item=>!item.subtopic).map(item=>
      '<a href="#guide/'+item.slug+'"><img src="/assets/'+item.picture+'.webp" alt="" width="320" height="152" loading="lazy"><span><strong>'+item.title+'</strong><small>'+item.hint+'</small></span></a>'
    ).join('')+'</nav><aside class="bait-check"><h3>Before you collect</h3><p>Find the water you plan to use on the marine park map. Green zones are closed to recreational bait collecting. Island lakes and streams are closed too. Keep only enough for your session.</p><div><a href="#guide/zones">Check the zone and local closures</a><a href="#guide/customary-rights">Read about customary fishing rights</a><a href="#guide/crabbing">Looking for the crabbing guide?</a></div></aside>';
}
