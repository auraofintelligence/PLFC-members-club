// Keep every topic readable from a direct link when scripting is unavailable.
for (const topic of document.querySelectorAll('.topics details')) {
  topic.open = topic.id === 'water' || topic.id === location.hash.slice(1);
}
function showTopic() {
  const target = document.getElementById(location.hash.slice(1));
  if (target instanceof HTMLDetailsElement) {
    target.open = true;
    target.scrollIntoView();
  }
}
window.addEventListener('hashchange', showTopic);
document.querySelector('.index').addEventListener('click', event => {
  const anchor = event.target.closest('a');
  if (!anchor) return;
  const topic = document.getElementById(anchor.hash.slice(1));
  if (topic instanceof HTMLDetailsElement) topic.open = true;
});
showTopic();

const coordinates = document.querySelector('#locate');
const message = document.querySelector('#location-result');
if (navigator.geolocation) {
  coordinates.parentElement.hidden = false;
  coordinates.addEventListener('click', () => {
    coordinates.disabled = true;
    message.textContent = 'Finding your position. Call 000 now if you need help.';
    navigator.geolocation.getCurrentPosition(({coords}) => {
      const lat = Math.abs(coords.latitude).toFixed(5) + '° ' + (coords.latitude < 0 ? 'south' : 'north');
      const lon = Math.abs(coords.longitude).toFixed(5) + '° ' + (coords.longitude < 0 ? 'west' : 'east');
      message.textContent = lat + ', ' + lon + '. Estimated accuracy ' + Math.ceil(coords.accuracy) + ' metres. Read this to the operator.';
      coordinates.disabled = false;
    }, () => {
      message.textContent = 'Position unavailable. Tell 000 the beach, jetty or nearest signed access point.';
      coordinates.disabled = false;
    }, {enableHighAccuracy:true, maximumAge:0, timeout:10000});
  });
}
const print = document.querySelector('#print-aid');
print.hidden = false;
print.addEventListener('click', () => window.print());
let printState = [];
window.addEventListener('beforeprint', () => {
  printState = [...document.querySelectorAll('details:not([open])')];
  printState.forEach(item => item.open = true);
});
window.addEventListener('afterprint', () => {
  printState.forEach(item => item.open = false);
  printState = [];
});
