checkLogin();
let current = 'home', state = { page: 1, size: 10, total: 0 };

const cols = {
  proteins: [['uniprot_accession', 'UniProt Accession'], ['gene_name', 'Gene Name'], ['protein_name', 'Protein Name'], ['species_name', 'Species'], ['biomolecular_condensate_count', 'Biomolecular Condensates'], ['synthetic_condensate_count', 'Synthetic Condensates']],
  kinases: [['entry_name', 'Kinase Entry'], ['uniprot_accession', 'UniProt Accession'], ['gene_name', 'Gene Name'], ['sequence_length', 'Sequence Length'], ['reviewed_flag', 'Reviewed']],
  condensates: [['condensate_uid', 'Condensate UID'], ['condensate_name', 'Condensate Name'], ['condensate_type', 'Type'], ['species_tax_id', 'Species Tax ID'], ['proteins_count', 'Protein Count'], ['has_dna', 'DNA'], ['has_rna', 'RNA'], ['confidence_score', 'Confidence Score']],
  diseases: [['disease_id', 'Disease ID'], ['disease_name', 'Disease Name']],
  cmods: [['cmod_id', 'C-mod ID'], ['cmod_name', 'Chemical Modifier'], ['biomolecular_type', 'Biomolecular Type'], ['phenotypic_class', 'Phenotypic Class']],
  publications: [['pmid', 'PMID']],
  advanced: [['uniprot_accession', 'UniProt Accession'], ['gene_name', 'Gene Name'], ['protein_name', 'Protein Name'], ['species_name', 'Species'], ['condensates', 'Matched Condensates'], ['diseases', 'Matched Diseases'], ['chemical_modifications', 'Matched Chemical Modifications'], ['pmids', 'Matched Publications']]
};

function setNav(n) {
  document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('nav-' + n)?.classList.add('active');
}

function page(title, name, tip) {
  current = name;
  state.page = 1;
  setNav(name);
  document.getElementById('app').innerHTML = `<div class="card"><h2>${title}</h2><p>${tip || ''}</p><div class="toolbar"><input id="kw" class="input" placeholder="Enter keywords"><button class="btn primary" onclick="loadList(1)">Search</button><button class="btn" onclick="exportUrl('${name}')">Export Excel</button></div><div id="list"></div></div>`;
  loadList(1);
}

async function loadList(p = 1) {
  state.page = p;
  const kw = document.getElementById('kw')?.value || '';
  const data = await api(`api/${current}?page=${state.page}&size=${state.size}&keyword=${encodeURIComponent(kw)}`);
  state.total = data.total;
  let actions = null;
  if (current === 'proteins') actions = r => `<button class="btn small" onclick="showProteinCond(${r.protein_id})">Condensates</button>`;
  if (current === 'kinases') actions = r => `<button class="btn small" onclick="showSeq(${r.protein_id})">Sequence</button>`;
  if (current === 'condensates') actions = r => `<button class="btn small" onclick="showCondProteins(${r.condensate_id})">Proteins/Kinases</button> <button class="btn small" onclick="showCondDiseases(${r.condensate_id})">Diseases</button>`;
  if (current === 'diseases') actions = r => `<button class="btn small" onclick="showDiseaseCond(${r.disease_id})">Evidence</button>`;
  if (current === 'cmods') actions = r => `<button class="btn small" onclick="showCmodCond(${r.cmod_id})">Affected Condensates</button>`;
  if (current === 'publications') actions = r => `<button class="btn small" onclick="showPmid('${r.pmid}')">Evidence</button>`;
  document.getElementById('list').innerHTML = tableHtml(cols[current], data.items, actions) + pagerHtml(state);
}

const optionCache = {};

async function loadOptions(name) {
  if (!optionCache[name]) optionCache[name] = await api(`api/options/${name}`);
  return optionCache[name];
}

function autocompleteField(id, label, placeholder) {
  return `<div class="form-row autocomplete-field"><label>${label}</label><input id="${id}Text" class="input" autocomplete="off" placeholder="${placeholder}" oninput="renderAdvancedSuggestions('${id}')" onfocus="renderAdvancedSuggestions('${id}')" onkeydown="handleAdvancedSuggestKey(event,'${id}')"><input id="${id}" type="hidden"><div id="${id}Suggest" class="suggest-box"></div><small class="field-hint">Type to match the most relevant database option, then choose one suggestion.</small></div>`;
}

async function prepareAutocomplete(id, optionName) {
  const rows = await loadOptions(optionName);
  const el = document.getElementById(id + 'Text');
  if (el) el.dataset.options = JSON.stringify(rows);
}

function optionScore(o, q) {
  const label = String(o.label || '').toLowerCase();
  const value = String(o.value || '').toLowerCase();
  if (!q) return 1;
  if (label === q || value === q) return 100;
  if (label.startsWith(q) || value.startsWith(q)) return 80;
  if (label.includes(q) || value.includes(q)) return 55;
  return 0;
}

function renderAdvancedSuggestions(id) {
  const input = document.getElementById(id + 'Text');
  const hidden = document.getElementById(id);
  const box = document.getElementById(id + 'Suggest');
  if (!input || !hidden || !box) return;
  hidden.value = '';
  const q = input.value.trim().toLowerCase();
  const rows = JSON.parse(input.dataset.options || '[]');
  const matches = rows.map(o => ({...o, score: optionScore(o, q)})).filter(o => o.score > 0).sort((a, b) => b.score - a.score || String(a.label).localeCompare(String(b.label))).slice(0, 8);
  if (!input.value.trim() || matches.length === 0) { box.innerHTML = ''; box.classList.remove('open'); return; }
  box.innerHTML = matches.map(o => `<button type="button" class="suggest-item" data-value="${esc(o.value)}" data-label="${esc(o.label)}" onclick="chooseAdvancedOption('${id}',this.dataset.value,this.dataset.label)"><b>${esc(o.label)}</b><span>${esc(o.value)}</span></button>`).join('');
  box.classList.add('open');
}

function chooseAdvancedOption(id, value, label) {
  document.getElementById(id).value = value;
  document.getElementById(id + 'Text').value = `${label} (${value})`;
  document.getElementById(id + 'Suggest').classList.remove('open');
  document.getElementById(id + 'Suggest').innerHTML = '';
}

function handleAdvancedSuggestKey(event, id) {
  if (event.key === 'Enter') { event.preventDefault(); const first = document.querySelector(`#${id}Suggest .suggest-item`); if (first) first.click(); else loadAdvanced(1); }
  if (event.key === 'Escape') document.getElementById(id + 'Suggest')?.classList.remove('open');
}

async function advancedSearch() {
  current = 'advanced';
  state.page = 1;
  setNav('advanced');
  document.getElementById('app').innerHTML = `<div class="card"><h2>Advanced Search</h2><p>Search by protein name, then narrow results by condensate, disease, chemical modification, or publication evidence. Start typing in any filter to see the closest database matches.</p><div class="grid advanced-grid"><div class="form-row"><label>Search by protein name</label><input id="advProteinName" class="input" placeholder="Protein name keyword" onkeydown="if(event.key==='Enter') loadAdvanced(1)"><small class="field-hint">Free-text match against protein names.</small></div>${autocompleteField('advCondensate', 'Filter by condensate', 'Type condensate name or ID')}${autocompleteField('advDisease', 'Filter by disease', 'Type disease name or ID')}${autocompleteField('advCmod', 'Filter by chemical modification', 'Type modifier name or ID')}${autocompleteField('advPmid', 'Filter by publication', 'Type PMID')}</div><div class="toolbar"><button class="btn primary" onclick="loadAdvanced(1)">Search</button><button class="btn" onclick="clearAdvanced()">Clear</button></div><div id="list"></div></div>`;
  await Promise.all([
    prepareAutocomplete('advCondensate', 'condensates'),
    prepareAutocomplete('advDisease', 'diseases'),
    prepareAutocomplete('advCmod', 'cmods'),
    prepareAutocomplete('advPmid', 'publications')
  ]);
  loadAdvanced(1);
}

async function loadAdvanced(p = 1) {
  state.page = p;
  const params = new URLSearchParams({
    page: state.page,
    size: state.size,
    protein_name: document.getElementById('advProteinName')?.value || '',
    condensate_id: document.getElementById('advCondensate')?.value || '',
    disease_id: document.getElementById('advDisease')?.value || '',
    cmod_id: document.getElementById('advCmod')?.value || '',
    pmid: document.getElementById('advPmid')?.value || ''
  });
  const data = await api(`api/search/advanced?${params.toString()}`);
  state.total = data.total;
  const actions = r => `<button class="btn small" onclick="showProteinCond(${r.protein_id})">Condensates</button>`;
  document.getElementById('list').innerHTML = tableHtml(cols.advanced, data.items, actions) + advancedPagerHtml(state);
}

function advancedPagerHtml(s) {
  return pagerHtml(s, 'loadAdvanced', 'advancedPageJump');
}

function clearAdvanced() {
  ['advProteinName', 'advCondensate', 'advDisease', 'advCmod', 'advPmid'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
    const txt = document.getElementById(id + 'Text');
    if (txt) txt.value = '';
    const box = document.getElementById(id + 'Suggest');
    if (box) { box.innerHTML = ''; box.classList.remove('open'); }
  });
  loadAdvanced(1);
}

async function showProteinCond(id) {
  const rows = await api(`api/proteins/${id}/condensates`);
  showModal('Condensates associated with this protein', tableHtml(cols.condensates, rows));
}
async function showCondProteins(id) {
  const rows = await api(`api/condensates/${id}/proteins`);
  showModal('Proteins / kinases in this condensate', tableHtml(cols.proteins, rows));
}
async function showCondDiseases(id) {
  const rows = await api(`api/condensates/${id}/diseases`);
  showModal('Disease associations', tableHtml([['disease_name', 'Disease Name'], ['dysregulation_type', 'Dysregulation Type'], ['condensate_markers', 'Condensate Markers'], ['pmid', 'PubMed PMID']], rows));
}
async function showDiseaseCond(id) {
  const rows = await api(`api/diseases/${id}/condensates`);
  showModal('Disease evidence', tableHtml([['condensate_name', 'Condensate'], ['dysregulation_type', 'Dysregulation Type'], ['condensate_markers', 'Condensate Markers'], ['pmid', 'PubMed PMID']], rows));
}
async function showCmodCond(id) {
  const rows = await api(`api/cmods/${id}/condensates`);
  showModal('Condensates affected by this chemical modifier', tableHtml(cols.condensates.concat([['pmid', 'PMID']]), rows));
}
async function showSeq(id) {
  const data = await api(`api/kinases?keyword=&page=1&size=100`);
  const k = data.items.find(x => x.protein_id == id);
  showModal('Protein Sequence', `<div class="seq">${esc(k?.sequence || 'No sequence found')}</div>`);
}
async function showPmid(pmid) {
  const d = await api(`api/publications/${encodeURIComponent(pmid)}/evidence`);
  showModal('PubMed Evidence', `<h3>Condensate-Disease Relations</h3>${tableHtml([['condensate_name', 'Condensate'], ['disease_name', 'Disease'], ['dysregulation_type', 'Dysregulation'], ['condensate_markers', 'Markers'], ['pmid', 'PMID']], d.disease_relations)}<h3>Condensate-Chemical Modifier Relations</h3>${tableHtml([['condensate_name', 'Condensate'], ['cmod_name', 'Chemical Modifier'], ['pmid', 'PMID']], d.cmod_relations)}`);
}

function home() {
  current = 'home';
  setNav('home');
  document.getElementById('app').innerHTML = `<div class="hero portal-hero"><span class="landing-badge">Human-centered research portal</span><h1>CondensateDB Query Portal</h1><p>An integrated workspace for exploring biomolecular condensates, kinases, disease evidence, chemical modifiers, and PubMed-supported relationships.</p><div class="hero-actions"><button class="btn primary" onclick="advancedSearch()">Start Advanced Search</button><button class="btn" onclick="network()">Explore Network Graph</button></div></div><div class="dash-grid" id="stats"></div><div class="schema-section"><div class="schema-header"><h2>Choose a research path</h2><p>Start with a biological entity, then follow related records, evidence, and network context.</p></div><div class="quick-list"><button class="btn quick" onclick="advancedSearch()"><span><b>Advanced Search</b><small>Protein keyword with condensate, disease, chemical-modifier, and publication filters</small></span></button><button class="btn quick" onclick="page('Protein Information','proteins','Which biomolecular condensates is a human kinase associated with? What are the condensate types and confidence scores?')"><span><b>Human kinase → condensates</b><small>Find associated condensates, types, and confidence scores</small></span></button><button class="btn quick" onclick="page('Condensate Information','condensates','Which human kinases are contained in a specific condensate? What are their UniProt accessions, gene names, and sequence lengths?')"><span><b>Condensate → contained kinases</b><small>Review UniProt accessions, gene names, and sequence metadata</small></span></button><button class="btn quick" onclick="page('Condensate Information','condensates','Which biomolecular condensates are associated with a disease or dysregulation type? What PubMed PMIDs support these associations?')"><span><b>Disease / dysregulation → evidence</b><small>Connect condensate associations to PubMed-supported findings</small></span></button><button class="btn quick" onclick="network()"><span><b>Interactive Network Graph</b><small>Visualize protein-condensate-disease-C-mod relationships</small></span></button></div></div>`;
  loadStats();
}

async function loadStats() {
  const s = await api('api/stats/summary');
  stats.innerHTML = Object.entries({ 'Proteins': s.protein_total, 'Kinases': s.kinase_total, 'Condensates': s.condensate_total, 'Diseases': s.disease_total }).map(([k, v]) => `<div class="dash-card stat"><span class="dash-label">${k}</span><b class="dash-value">${v}</b></div>`).join('');
}
function complex() {
  setNav('complex');
  document.getElementById('app').innerHTML = `<div class="card integrated-card"><h2>Integrated Query</h2><p>Choose a guided analysis view. Each tile opens one query workflow with more breathing room than the compact tab bar.</p><div class="query-grid"><button class="query-tile" onclick="advancedSearch()"><b>Advanced Search</b><span>Combine protein, condensate, disease, modifier, and publication filters</span></button><button class="query-tile" onclick="page('Chemical Modifier Query','cmods','Query C-mod information and view affected condensates')"><b>Chemical Modifier Query</b><span>Review modifiers and affected condensates</span></button><button class="query-tile" onclick="page('Literature Evidence Query','publications','Search evidence by PubMed PMID')"><b>Literature Evidence</b><span>Search PubMed evidence by PMID</span></button><button class="query-tile" onclick="charts()"><b>Statistical Charts</b><span>Summarize major counts and rankings visually</span></button><button class="query-tile" onclick="network()"><b>Network Graph</b><span>Explore protein-condensate-disease-C-mod relationships</span></button></div></div><div id="complexBox"></div>`;
}
async function charts() {
  document.getElementById('complexBox').innerHTML = '<div class="charts"><div class="card chart" id="c1"></div><div class="card chart" id="c2"></div><div class="card chart" id="c3"></div><div class="card chart" id="c4"></div><div class="card chart" id="c5"></div></div>';
  const d = await api('api/stats/charts');
  drawPie('c1', 'Condensate Count by Type', d.condensate_type);
  drawBar('c2', 'Disease-Associated Condensate Count', d.disease_rank);
  drawBar('c3', 'Condensate Count by Species', d.species_count);
  drawPie('c4', 'Chemical Modifier Type Count', d.cmod_type);
  drawBar('c5', 'Top Proteins by Condensate Associations', d.protein_rank);
}
function drawPie(id, title, data) { echarts.init(document.getElementById(id)).setOption({ title: { text: title }, tooltip: {}, series: [{ type: 'pie', radius: '60%', data }] }); }
function drawBar(id, title, data) { echarts.init(document.getElementById(id)).setOption({ title: { text: title }, tooltip: {}, xAxis: { type: 'category', data: data.map(x => x.name), axisLabel: { rotate: 30 } }, yAxis: { type: 'value' }, series: [{ type: 'bar', data: data.map(x => x.value) }] }); }


function network() {
  current = 'network';
  setNav('network');
  document.getElementById('app').innerHTML = `
    <div class="card">
      <h2>Interactive Network Graph</h2>
      <p>Explore protein-condensate, condensate-disease, and condensate-chemical modifier relationships. The page uses AJAX/fetch to load JSON from Flask and Cytoscape.js to render the graph.</p>
      <div class="toolbar">
        <input id="networkKw" class="input" placeholder="Search protein, condensate, disease, C-mod, PMID" onkeydown="if(event.key==='Enter') loadNetwork()">
        <select id="networkMode" class="input network-select">
          <option value="all">All relation types</option>
          <option value="protein_condensate">Protein ↔ Condensate</option>
          <option value="condensate_disease">Condensate ↔ Disease</option>
          <option value="condensate_cmod">Condensate ↔ Chemical Modifier</option>
        </select>
        <select id="networkLimit" class="input network-select">
          <option value="40">40 relations each type</option>
          <option value="80" selected>80 relations each type</option>
          <option value="150">150 relations each type</option>
          <option value="300">300 relations each type</option>
        </select>
        <button class="btn primary" onclick="loadNetwork()">Load Graph</button>
      </div>
      <div class="network-wrap">
        <div id="cy"></div>
        <div class="network-panel">
          <h3>Graph Summary</h3>
          <div id="networkSummary" class="muted">Loading...</div>
          <h3>Selected Item</h3>
          <div id="nodeDetails" class="muted">Click a node or edge to view details.</div>
          <h3>Legend</h3>
          <div class="legend"><span class="dot protein"></span>Protein</div>
          <div class="legend"><span class="dot condensate"></span>Condensate</div>
          <div class="legend"><span class="dot disease"></span>Disease</div>
          <div class="legend"><span class="dot cmod"></span>Chemical Modifier</div>
        </div>
      </div>
    </div>`;
  loadNetwork();
}

async function loadNetwork() {
  if (typeof cytoscape === 'undefined') {
    document.getElementById('cy').innerHTML = '<div class="empty-graph">Cytoscape.js was not loaded. Please check the CDN or use a local cytoscape.min.js file.</div>';
    return;
  }
  const kw = encodeURIComponent(document.getElementById('networkKw')?.value || '');
  const mode = document.getElementById('networkMode')?.value || 'all';
  const limit = document.getElementById('networkLimit')?.value || '80';
  const data = await api(`api/network?keyword=${kw}&mode=${mode}&limit=${limit}`);
  document.getElementById('networkSummary').innerHTML = `Nodes: <b>${data.summary.node_count}</b><br>Edges: <b>${data.summary.edge_count}</b><br>Mode: <b>${esc(data.summary.mode)}</b><br>Relation limit: <b>${esc(data.summary.limit)}</b>`;

  if (!data.elements || data.elements.length === 0) {
    document.getElementById('cy').innerHTML = '<div class="empty-graph">No network data found. Try another keyword or relation type.</div>';
    document.getElementById('nodeDetails').innerHTML = 'No item selected.';
    return;
  }

  const cy = cytoscape({
    container: document.getElementById('cy'),
    elements: data.elements,
    style: [
      { selector: 'node', style: {
        'label': 'data(label)',
        'font-size': '11px',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#0f172a',
        'text-outline-color': '#ffffff',
        'text-outline-width': 2,
        'width': 'mapData(weight, 1, 30, 34, 78)',
        'height': 'mapData(weight, 1, 30, 34, 78)',
        'background-color': '#94a3b8',
        'border-width': 2,
        'border-color': '#ffffff'
      }},
      { selector: 'node[type="protein"]', style: { 'background-color': '#2563eb', 'color': '#ffffff', 'text-outline-color': '#2563eb' } },
      { selector: 'node[type="condensate"]', style: { 'background-color': '#06b6d4', 'color': '#ffffff', 'text-outline-color': '#06b6d4' } },
      { selector: 'node[type="disease"]', style: { 'background-color': '#ef4444', 'color': '#ffffff', 'text-outline-color': '#ef4444' } },
      { selector: 'node[type="cmod"]', style: { 'background-color': '#f59e0b', 'color': '#ffffff', 'text-outline-color': '#f59e0b' } },
      { selector: 'edge', style: {
        'label': 'data(label)',
        'font-size': '9px',
        'curve-style': 'bezier',
        'target-arrow-shape': 'triangle',
        'line-color': '#94a3b8',
        'target-arrow-color': '#94a3b8',
        'width': 2,
        'color': '#475569',
        'text-background-color': '#ffffff',
        'text-background-opacity': 0.85,
        'text-background-padding': '2px'
      }},
      { selector: ':selected', style: { 'border-width': 5, 'border-color': '#111827', 'line-color': '#111827', 'target-arrow-color': '#111827' } }
    ],
    layout: { name: 'cose', animate: true, fit: true, padding: 40, randomize: true, nodeRepulsion: 7000, idealEdgeLength: 110 }
  });

  cy.on('tap', 'node, edge', evt => {
    const d = evt.target.data();
    document.getElementById('nodeDetails').innerHTML = detailHtml(d);
  });

  cy.on('tap', evt => {
    if (evt.target === cy) {
      document.getElementById('nodeDetails').innerHTML = 'Click a node or edge to view details.';
    }
  });
}

function detailHtml(d) {
  const skip = new Set(['id', 'source', 'target', 'weight']);
  return Object.entries(d)
    .filter(([k, v]) => !skip.has(k) && v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `<div class="detail-row"><b>${esc(k.replaceAll('_', ' '))}</b><br>${renderDetailValue(k, v)}</div>`)
    .join('') || 'No details available.';
}

function renderDetailValue(k, v) {
  if (k === 'uniprot_accession') return `<a href="${uniprotUrl(v)}" target="_blank" rel="noopener">${esc(v)}</a>`;
  if (k === 'pmid') return renderPmidLinks(v);
  return esc(v);
}


home();
