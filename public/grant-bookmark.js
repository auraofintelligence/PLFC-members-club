import {parseLocationHash} from './page-routing.js?v=20261121-clubhouse-menu';

// Old links used document anchors and kept the finder's filters in the query.
const target = new URL('/', location.origin);
target.search = location.search;
const section = location.hash.slice(1);
const slug = section === 'grant-research' ? 'research' : section;
target.hash = parseLocationHash('#grants/' + slug).hash;
location.replace(target.href);
