'use strict';

const state = { query: '', authorship: 'all' };
let publications = [];
let currentCitation = '';
let lastCitationButton = null;
let demoObserver = null;
const $ = selector => document.querySelector(selector);
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const authorHTML = text => escapeHTML(text).replace(/Zhide Zhong[\*†]*|Z Zhong[\*†]*/g, '<strong>$&</strong>');
const linkHTML = (url, label) => `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
const isFirstAuthor = paper => paper.firstAuthor === true || paper.equalContribution === true;

function paperHTML(paper) {
  let visual = '';
  if (paper.video) {
    visual = `<div class="paper-media"><div class="one paper-visual"><video muted loop playsinline preload="metadata" poster="${escapeHTML(paper.image)}" aria-label="VPP2 open-world robot manipulation video prediction"><source src="${escapeHTML(paper.video)}" type="video/mp4"></video><button class="video-toggle" type="button" aria-label="Play VPP2 demo">Play demo</button></div></div>`;
  } else if (paper.image) {
    visual = `<div class="paper-media"><a class="one paper-visual" href="${escapeHTML(paper.project || paper.paper)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML(paper.short)} research overview"><img src="${escapeHTML(paper.image)}" alt="${escapeHTML(paper.imageAlt || paper.short + ' research overview')}" loading="lazy" width="160" height="160"></a></div>`;
  }
  const links = [linkHTML(paper.paper, 'paper'), paper.project && linkHTML(paper.project, 'project page'), paper.code && linkHTML(paper.code, 'code'), paper.journal && linkHTML(paper.journal, 'journal'), paper.demo && linkHTML(paper.demo, 'video'), `<button type="button" class="cite-button" data-cite="${escapeHTML(paper.id)}" aria-label="BibTeX for ${escapeHTML(paper.short || paper.title)}">bibtex</button>`].filter(Boolean).join(' / ');
  return `<article class="paper publication-card${paper.featured ? ' highlighted' : ''}${visual ? '' : ' no-image'}" data-paper-id="${escapeHTML(paper.id)}">
    ${visual}<div class="paper-info">
    <h3><a class="papertitle" href="${escapeHTML(paper.paper)}" target="_blank" rel="noopener noreferrer">${escapeHTML(paper.title)}</a></h3>
    <p class="paper-authors">${authorHTML(paper.authors)}</p>
    <div class="paper-venue"><em>${escapeHTML(paper.venueLabel)}</em>, ${paper.year}</div>
    <div class="paper-links">${links}</div>${paper.description ? `<p class="paper-desc paper-summary">${escapeHTML(paper.description)}</p>` : ''}</div></article>`;
}

function render() {
  demoObserver?.disconnect();
  const terms = state.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const visible = publications.filter(paper => {
    if (state.authorship === 'first' && !isFirstAuthor(paper)) return false;
    const haystack = [paper.title, paper.authors, paper.year, paper.venueLabel, paper.short].join(' ').toLowerCase();
    return terms.every(term => haystack.includes(term));
  });
  const list = $('#publication-list');
  let lastYear;
  list.innerHTML = visible.map(paper => {
    const heading = paper.year !== lastYear ? `<h3 class="publication-year">${paper.year}</h3>` : '';
    lastYear = paper.year;
    return heading + paperHTML(paper);
  }).join('');
  document.querySelectorAll('[data-authorship]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.authorship === state.authorship));
  });
  $('#all-publications-count').textContent = ` (${publications.length})`;
  $('#first-author-count').textContent = ` (${publications.filter(isFirstAuthor).length})`;
  $('#publication-count').textContent = `${visible.length} ${visible.length === 1 ? 'publication' : 'publications'}`;
  $('#empty-state').hidden = visible.length !== 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const video = list.querySelector('video');
  if (video && !reducedMotion) {
    demoObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) video.play().then(() => syncVideoButton(video)).catch(() => syncVideoButton(video));
      else { video.pause(); syncVideoButton(video); }
    }), { threshold: 0.25 });
    demoObserver.observe(video);
  }
}

function syncVideoButton(video) {
  const button = video.parentElement.querySelector('.video-toggle');
  button.textContent = video.paused ? 'Play demo' : 'Pause demo';
  button.setAttribute('aria-label', video.paused ? 'Play VPP2 demo' : 'Pause VPP2 demo');
}

$('#publication-search').addEventListener('input', event => { state.query = event.target.value; render(); });
$('.publication-filters').addEventListener('click', event => {
  const button = event.target.closest('[data-authorship]');
  if (!button || button.dataset.authorship === state.authorship) return;
  state.authorship = button.dataset.authorship;
  render();
});
$('#reset-filters').addEventListener('click', () => {
  state.query = ''; state.authorship = 'all'; $('#publication-search').value = ''; render(); $('#publication-search').focus();
});

$('#publication-list').addEventListener('click', event => {
  const cite = event.target.closest('[data-cite]');
  if (cite) {
    const paper = publications.find(item => item.id === cite.dataset.cite);
    currentCitation = paper.bibtex; $('#citation-code').textContent = currentCitation; $('#copy-status').textContent = '';
    $('#copy-citation').textContent = 'Copy BibTeX'; lastCitationButton = cite; $('#citation-dialog').showModal();
  }
  const toggle = event.target.closest('.video-toggle');
  if (toggle) {
    const video = toggle.parentElement.querySelector('video');
    if (video.paused) video.play().then(() => syncVideoButton(video)).catch(() => { toggle.textContent = 'Try playing again'; });
    else { video.pause(); syncVideoButton(video); }
  }
});
$('#close-citation').addEventListener('click', () => $('#citation-dialog').close());
$('#citation-dialog').addEventListener('click', event => {
  if (event.target !== $('#citation-dialog')) return;
  const rect = event.target.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close();
});
$('#citation-dialog').addEventListener('close', () => lastCitationButton?.focus());
$('#copy-citation').addEventListener('click', async () => {
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(currentCitation);
    else {
      const textarea = document.createElement('textarea'); textarea.value = currentCitation; textarea.style.position = 'fixed'; textarea.style.opacity = '0';
      $('#citation-dialog').append(textarea); textarea.select(); const copied = document.execCommand('copy'); textarea.remove();
      if (!copied) throw new Error('Clipboard unavailable');
    }
    $('#copy-status').textContent = 'Citation copied to clipboard.'; $('#copy-citation').textContent = 'Copied';
  } catch (_) {
    $('#copy-status').textContent = 'Select the citation above to copy it manually.';
    const selection = window.getSelection(), range = document.createRange(); range.selectNodeContents($('#citation-code')); selection.removeAllRanges(); selection.addRange(range);
  }
});
$('#download-bib').addEventListener('click', () => {
  const blob = new Blob([publications.map(paper => paper.bibtex).join('\n\n') + '\n'], { type: 'application/x-bibtex;charset=utf-8' });
  const url = URL.createObjectURL(blob), anchor = document.createElement('a'); anchor.href = url; anchor.download = 'zhide-zhong-publications.bib'; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});

fetch('publications.json', { cache: 'no-cache' }).then(response => { if (!response.ok) throw new Error('Publication data unavailable'); return response.json(); }).then(data => {
  publications = data.sort((a, b) => b.year - a.year); render();
}).catch(() => { $('#publication-count').textContent = 'The publication list could not be loaded. Please use the Google Scholar link above.'; });

if ('IntersectionObserver' in window) {
  const navObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) document.querySelectorAll('nav a').forEach(link => link.classList.toggle('current', link.hash === '#' + entry.target.id));
  }), { rootMargin: '-15% 0px -60% 0px' });
  document.querySelectorAll('main section[id]').forEach(section => navObserver.observe(section));
}
