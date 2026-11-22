const copyButton = document.querySelector('#copy-description');
const description = document.querySelector('#club-description');
const feedback = document.querySelector('#copy-feedback');
const printButton = document.querySelector('#print-pack');

copyButton.hidden = false;
printButton.hidden = false;
printButton.addEventListener('click', () => window.print());
copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(description.textContent.trim());
    feedback.textContent = 'Copied. Paste it into your story or program.';
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(description);
    selection.removeAllRanges();
    selection.addRange(range);
    feedback.textContent = 'The description is selected. Choose Copy in your browser.';
  }
});
