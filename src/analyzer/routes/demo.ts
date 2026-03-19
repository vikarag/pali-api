export const demoHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pali Analyzer Demo</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body {
    max-width: 60rem; margin: 2rem auto; padding: 0 1rem;
    font-family: system-ui, -apple-system, sans-serif;
    line-height: 1.6; color: #1a1a1a; background: #fafafa;
  }
  h1 { margin: 0 0 0.25rem; font-size: 1.5rem; }
  .subtitle { color: #666; margin: 0 0 1.5rem; font-size: 0.95rem; }
  .input-area {
    background: #fff; border: 1px solid #ddd; border-radius: 8px;
    padding: 1.25rem; margin-bottom: 1.5rem;
  }
  textarea {
    width: 100%; min-height: 5rem; padding: 0.75rem; border: 1px solid #ccc;
    border-radius: 6px; font-size: 1.05rem; font-family: inherit;
    resize: vertical; line-height: 1.5;
  }
  textarea:focus { outline: none; border-color: #4f8ff7; box-shadow: 0 0 0 2px rgba(79,143,247,0.2); }
  .controls { display: flex; gap: 0.5rem; margin-top: 0.75rem; align-items: center; }
  button {
    padding: 0.5rem 1.25rem; border: none; border-radius: 6px;
    font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: all 0.15s;
  }
  .btn-primary { background: #4f8ff7; color: #fff; }
  .btn-primary:hover { background: #3a7be0; }
  .btn-primary:disabled { background: #b0cdf7; cursor: not-allowed; }
  .btn-secondary { background: #e8e8e8; color: #555; }
  .btn-secondary:hover { background: #ddd; }
  .examples { margin-left: auto; font-size: 0.85rem; color: #888; }
  .examples a { color: #4f8ff7; text-decoration: none; cursor: pointer; }
  .examples a:hover { text-decoration: underline; }
  .status { font-size: 0.85rem; color: #888; margin-left: 0.75rem; }

  /* Results */
  .results { display: none; }
  .results.visible { display: block; }
  .section-label {
    font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em;
    color: #999; margin: 1.5rem 0 0.75rem; font-weight: 600;
  }

  /* Interlinear display */
  .interlinear {
    display: flex; flex-wrap: wrap; gap: 0.5rem;
    background: #fff; border: 1px solid #ddd; border-radius: 8px;
    padding: 1.25rem; align-items: flex-start;
  }
  .token-card {
    display: flex; flex-direction: column; align-items: center;
    padding: 0.5rem 0.625rem; border-radius: 6px; border: 2px solid transparent;
    cursor: pointer; transition: all 0.15s; min-width: 3rem; position: relative;
  }
  .token-card:hover { background: #f0f4ff; }
  .token-card.selected { border-color: #4f8ff7; background: #f0f4ff; }
  .token-card.punct { cursor: default; min-width: 1rem; }
  .token-surface {
    font-size: 1.15rem; font-weight: 600; margin-bottom: 0.2rem;
    white-space: nowrap;
  }
  .token-tag {
    font-size: 0.7rem; font-weight: 600; padding: 0.1rem 0.4rem;
    border-radius: 3px; white-space: nowrap;
  }
  .token-gloss {
    font-size: 0.75rem; color: #666; margin-top: 0.15rem;
    max-width: 8rem; text-align: center; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap;
  }
  .token-flags {
    display: flex; gap: 0.2rem; margin-top: 0.2rem;
  }
  .flag {
    font-size: 0.6rem; padding: 0.05rem 0.3rem; border-radius: 2px;
    font-weight: 600;
  }
  .flag-sandhi { background: #fce4ec; color: #c62828; }
  .flag-compound { background: #e8f5e9; color: #2e7d32; }
  .flag-ambiguous { background: #fff3e0; color: #e65100; }

  /* POS colors */
  .pos-noun .token-tag { background: #e3f2fd; color: #1565c0; }
  .pos-verb .token-tag { background: #fbe9e7; color: #bf360c; }
  .pos-adj .token-tag  { background: #e8f5e9; color: #2e7d32; }
  .pos-ind .token-tag  { background: #f3e5f5; color: #7b1fa2; }
  .pos-pron .token-tag { background: #e0f2f1; color: #00695c; }
  .pos-pp .token-tag   { background: #fff8e1; color: #f57f17; }
  .pos-other .token-tag { background: #f5f5f5; color: #616161; }
  .pos-sandhi .token-tag { background: #fce4ec; color: #c62828; }

  /* Detail panel */
  .detail-panel {
    background: #fff; border: 1px solid #ddd; border-radius: 8px;
    padding: 1.25rem; margin-top: 1rem; display: none;
  }
  .detail-panel.visible { display: block; }
  .detail-header {
    display: flex; align-items: baseline; gap: 0.75rem;
    margin-bottom: 1rem; border-bottom: 1px solid #eee; padding-bottom: 0.75rem;
  }
  .detail-surface { font-size: 1.4rem; font-weight: 700; }
  .detail-tag { font-size: 0.85rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 4px; background: #e3f2fd; color: #1565c0; }

  /* Analysis cards */
  .analyses-grid { display: flex; flex-direction: column; gap: 0.75rem; }
  .analysis-card {
    border: 1px solid #e8e8e8; border-radius: 6px; padding: 0.75rem 1rem;
  }
  .analysis-card.primary { border-color: #4f8ff7; background: #f8faff; }
  .analysis-row { display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; font-size: 0.9rem; }
  .analysis-field { display: flex; gap: 0.3rem; }
  .field-label { color: #999; font-size: 0.8rem; }
  .field-value { font-weight: 500; }
  .analysis-rank {
    font-size: 0.7rem; color: #aaa; float: right; font-weight: 600;
  }

  /* Sandhi detail */
  .sandhi-detail {
    margin-top: 0.75rem; padding: 0.75rem; background: #fdf2f4;
    border-radius: 6px; border: 1px solid #f5c6cb;
  }
  .sandhi-parts {
    display: flex; align-items: center; gap: 0.5rem; font-size: 1.05rem;
    font-weight: 600; margin-bottom: 0.5rem;
  }
  .sandhi-arrow { color: #c62828; font-size: 0.9rem; }
  .sandhi-part-analyses { margin-left: 1rem; }
  .sandhi-part-label { font-weight: 600; font-size: 0.85rem; margin: 0.4rem 0 0.2rem; color: #555; }

  /* Compound detail */
  .compound-detail {
    margin-top: 0.75rem; padding: 0.75rem; background: #f1f8e9;
    border-radius: 6px; border: 1px solid #c5e1a5;
  }
  .compound-type { font-weight: 600; color: #33691e; margin-bottom: 0.4rem; }
  .compound-components {
    display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.4rem;
  }
  .compound-component {
    padding: 0.3rem 0.6rem; background: #fff; border: 1px solid #c5e1a5;
    border-radius: 4px; font-size: 0.85rem;
  }
  .comp-word { font-weight: 600; }
  .comp-pos { color: #888; font-size: 0.75rem; }
  .comp-meaning { color: #555; font-style: italic; }

  /* Word mode */
  .mode-tabs {
    display: flex; gap: 0; margin-bottom: 0.75rem;
  }
  .mode-tab {
    padding: 0.4rem 1rem; border: 1px solid #ddd; background: #f5f5f5;
    cursor: pointer; font-size: 0.85rem; transition: all 0.15s;
  }
  .mode-tab:first-child { border-radius: 6px 0 0 6px; }
  .mode-tab:last-child { border-radius: 0 6px 6px 0; }
  .mode-tab.active { background: #4f8ff7; color: #fff; border-color: #4f8ff7; }
  .mode-tab:not(.active):hover { background: #e8e8e8; }

  @media (max-width: 600px) {
    body { padding: 0 0.5rem; margin: 1rem auto; }
    .controls { flex-wrap: wrap; }
    .examples { margin-left: 0; width: 100%; }
    .interlinear { padding: 0.75rem; gap: 0.35rem; }
    .token-card { padding: 0.35rem 0.4rem; }
  }
</style>
</head>
<body>
<h1>Pali Analyzer</h1>
<p class="subtitle">Morphological analysis, sandhi resolution, and compound detection for Pali text</p>

<div class="input-area">
  <div class="mode-tabs">
    <div class="mode-tab active" data-mode="sentence">Sentence</div>
    <div class="mode-tab" data-mode="word">Word</div>
  </div>
  <textarea id="input" placeholder="Enter a Pali sentence or word\u2026" spellcheck="false"></textarea>
  <div class="controls">
    <button class="btn-primary" id="analyzeBtn" onclick="analyze()">Analyze</button>
    <button class="btn-secondary" onclick="clearAll()">Clear</button>
    <span class="status" id="status"></span>
    <span class="examples">
      Try: <a onclick="setExample(0)">sabbe sa\u1E45kh\u0101r\u0101 dukkh\u0101</a>
      &middot; <a onclick="setExample(1)">natthi santi para\u1E43 sukha\u1E43</a>
      &middot; <a onclick="setExample(2)">dhammacakkappavattana</a>
    </span>
  </div>
</div>

<div class="results" id="results">
  <div class="section-label">Analysis</div>
  <div class="interlinear" id="interlinear"></div>
  <div class="detail-panel" id="detailPanel"></div>
</div>

<script>
const EXAMPLES = [
  "sabbe sa\u1E45kh\u0101r\u0101 dukkh\u0101",
  "natthi santi para\u1E43 sukha\u1E43",
  "dhammacakkappavattana"
];

const POS_CLASS = {
  noun:'pos-noun', masc:'pos-noun', fem:'pos-noun', nt:'pos-noun',
  verb:'pos-verb', pr:'pos-verb', aor:'pos-verb', fut:'pos-verb',
  imp:'pos-verb', opt:'pos-verb', cond:'pos-verb', perf:'pos-verb', cs:'pos-verb',
  adj:'pos-adj',
  ind:'pos-ind', prefix:'pos-ind',
  pron:'pos-pron',
  pp:'pos-pp', prp:'pos-pp', ptp:'pos-pp', ger:'pos-pp', abs:'pos-pp', inf:'pos-pp',
  sandhi:'pos-sandhi',
};

let currentMode = 'sentence';
let currentData = null;

document.querySelectorAll('.mode-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentMode = tab.dataset.mode;
    document.getElementById('input').placeholder =
      currentMode === 'sentence' ? 'Enter a Pali sentence\u2026' : 'Enter a single Pali word\u2026';
  });
});

document.getElementById('input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); analyze(); }
});

function setExample(i) {
  document.getElementById('input').value = EXAMPLES[i];
  if (EXAMPLES[i].split(/\\s+/).length === 1) {
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-mode="word"]').classList.add('active');
    currentMode = 'word';
  } else {
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-mode="sentence"]').classList.add('active');
    currentMode = 'sentence';
  }
  analyze();
}

async function analyze() {
  const text = document.getElementById('input').value.trim();
  if (!text) return;
  const btn = document.getElementById('analyzeBtn');
  const status = document.getElementById('status');
  btn.disabled = true;
  status.textContent = 'Analyzing\u2026';

  try {
    let data;
    if (currentMode === 'word' || (!text.includes(' ') && currentMode === 'sentence')) {
      const word = text.split(/\\s+/)[0];
      const res = await fetch('/analyzer/word/' + encodeURIComponent(word));
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Not found'); }
      data = await res.json();
      data = { original: data.query, tokens: [{
        surface: data.surface || data.query,
        analyses: data.analyses || [],
        sandhi: data.sandhi || null,
        compound: data.compound || null,
        isPunctuation: false,
        isSandhi: data.isSandhi || false,
        isCompound: data.isCompound || false,
        ambiguous: data.ambiguous || false,
      }]};
    } else {
      const res = await fetch('/analyzer/sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Analysis failed'); }
      data = await res.json();
    }
    currentData = data;
    renderResults(data);
    status.textContent = data.tokens.filter(t => !t.isPunctuation).length + ' tokens';
  } catch (err) {
    status.textContent = err.message;
    document.getElementById('results').classList.remove('visible');
  } finally {
    btn.disabled = false;
  }
}

function renderResults(data) {
  const container = document.getElementById('interlinear');
  container.innerHTML = '';
  document.getElementById('detailPanel').classList.remove('visible');
  document.getElementById('results').classList.add('visible');

  data.tokens.forEach((token, idx) => {
    const card = document.createElement('div');
    card.className = 'token-card';

    if (token.isPunctuation) {
      card.classList.add('punct');
      card.innerHTML = '<span class="token-surface">' + esc(token.surface) + '</span>';
      container.appendChild(card);
      return;
    }

    const primary = token.analyses[0];
    const posClass = primary ? (POS_CLASS[primary.pos] || 'pos-other') : 'pos-other';
    card.classList.add(posClass);

    let html = '<span class="token-surface">' + esc(token.surface) + '</span>';
    if (primary) {
      html += '<span class="token-tag">' + esc(primary.tag || primary.pos) + '</span>';
      const gloss = primary.gloss ? primary.gloss.split(';')[0].trim() : '';
      if (gloss) html += '<span class="token-gloss" title="' + esc(primary.gloss) + '">' + esc(gloss) + '</span>';
    }

    const flags = [];
    if (token.isSandhi) flags.push('<span class="flag flag-sandhi">sandhi</span>');
    if (token.isCompound) flags.push('<span class="flag flag-compound">cpd</span>');
    if (token.ambiguous) flags.push('<span class="flag flag-ambiguous">' + token.analyses.length + ' readings</span>');
    if (flags.length) html += '<div class="token-flags">' + flags.join('') + '</div>';

    card.innerHTML = html;
    card.addEventListener('click', () => showDetail(token, idx));
    container.appendChild(card);
  });
}

function showDetail(token, idx) {
  document.querySelectorAll('.token-card').forEach((c, i) => {
    c.classList.toggle('selected', i === idx);
  });

  const panel = document.getElementById('detailPanel');
  panel.classList.add('visible');

  const primary = token.analyses[0];
  let html = '<div class="detail-header">';
  html += '<span class="detail-surface">' + esc(token.surface) + '</span>';
  if (primary) html += '<span class="detail-tag">' + esc(primary.tag || primary.pos) + '</span>';
  html += '</div>';

  // Analyses
  if (token.analyses.length) {
    html += '<div class="section-label">Analyses' + (token.analyses.length > 1 ? ' (' + token.analyses.length + ' readings)' : '') + '</div>';
    html += '<div class="analyses-grid">';
    token.analyses.forEach((a, i) => {
      html += '<div class="analysis-card' + (i === 0 ? ' primary' : '') + '">';
      if (token.analyses.length > 1) html += '<span class="analysis-rank">#' + (i+1) + '</span>';
      html += '<div class="analysis-row">';
      html += field('Lemma', a.lemma);
      html += field('POS', a.pos);
      if (a.inflection) html += field('Inflection', a.inflection);
      html += field('Tag', a.tag);
      html += '</div>';
      html += '<div class="analysis-row" style="margin-top:0.35rem">';
      if (a.gloss) html += field('Meaning', a.gloss);
      if (a.ebtCount) html += field('EBT freq', String(a.ebtCount));
      if (a.trans) html += field('Trans', a.trans);
      if (a.plusCase) html += field('+ case', a.plusCase);
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
  }

  // Sandhi
  if (token.sandhi) {
    html += '<div class="sandhi-detail">';
    html += '<div class="section-label" style="margin-top:0;color:#c62828">Sandhi Resolution</div>';
    html += '<div class="sandhi-parts">';
    html += esc(token.sandhi.original) + ' <span class="sandhi-arrow">\u2192</span> ';
    html += token.sandhi.parts.map(p => esc(p)).join(' + ');
    html += '</div>';
    if (token.sandhi.analyses) {
      html += '<div class="sandhi-part-analyses">';
      token.sandhi.parts.forEach((part, pi) => {
        const partAnalyses = token.sandhi.analyses[pi] || [];
        if (!partAnalyses.length) return;
        html += '<div class="sandhi-part-label">' + esc(part) + '</div>';
        partAnalyses.slice(0, 3).forEach(a => {
          html += '<div class="analysis-row" style="font-size:0.85rem;margin-left:0.5rem">';
          html += field('', a.lemma + ' (' + a.pos + ')');
          if (a.gloss) html += field('', a.gloss.split(';')[0].trim());
          html += '</div>';
        });
      });
      html += '</div>';
    }
    html += '</div>';
  }

  // Compound
  if (token.compound) {
    html += '<div class="compound-detail">';
    html += '<div class="section-label" style="margin-top:0;color:#33691e">Compound Analysis</div>';
    html += '<div class="compound-type">' + esc(token.compound.compoundType);
    if (token.compound.construction) html += ' &mdash; <span style="font-weight:400;color:#555">' + esc(token.compound.construction) + '</span>';
    html += '</div>';
    if (token.compound.components && token.compound.components.length) {
      html += '<div class="compound-components">';
      token.compound.components.forEach(c => {
        const [word, pos, meaning] = Array.isArray(c) ? c : [c.word||'', c.pos||'', c.meaning||''];
        html += '<div class="compound-component">';
        html += '<span class="comp-word">' + esc(word) + '</span>';
        if (pos) html += ' <span class="comp-pos">' + esc(pos) + '</span>';
        if (meaning) html += '<br><span class="comp-meaning">' + esc(meaning.split(';')[0].trim()) + '</span>';
        html += '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
  }

  panel.innerHTML = html;
}

function field(label, value) {
  if (label) return '<div class="analysis-field"><span class="field-label">' + label + ':</span> <span class="field-value">' + esc(value) + '</span></div>';
  return '<div class="analysis-field"><span class="field-value">' + esc(value) + '</span></div>';
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function clearAll() {
  document.getElementById('input').value = '';
  document.getElementById('results').classList.remove('visible');
  document.getElementById('status').textContent = '';
  currentData = null;
}

</script>
</body>
</html>`;
