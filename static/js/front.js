checkLogin();

let current = 'home';
let state = { page: 1, size: 10, total: 0 };

const HOME_CARDS = [
  {
    title: 'Advanced Search',
    detail: 'protein name + condensate / disease / chemical modification / publication filters',
    cmd: "advancedSearch()"
  },
  {
    title: 'Kinase-centric Query',
    detail: 'See human kinases and associated condensates, types, confidence scores',
    cmd: "page('Protein Information','proteins','Human kinase associated condensates and confidence scores')"
  },
  {
    title: 'Condensate-centric Query',
    detail: 'See proteins and kinases in a selected condensate',
    cmd: "page('Condensate Information','condensates','Condensates and their protein composition')"
  },
  {
    title: 'Disease / Dysregulation',
    detail: 'Explore disease-linked condensates with supporting PMIDs',
    cmd: "page('Condensate Information','condensates','Condensates linked with disease and PMIDs')"
  },
  {
    title: 'Network Explorer',
    detail: 'Explore protein-condensate-disease-C-mod relationships visually',
    cmd: "network()"
  }
];

const NETWORK_HINTS = ['BRD4', 'TP53', 'AKT1', 'FGFR1', 'NUP98', 'EGFR'];
const NETWORK_PREF_KEY = 'condensatedb_network_pref';

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

function setUserBadge() {
  let text = 'Standard User';
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    text = `${user.username || 'Guest'} · ${user.role === 'admin' ? 'Administrator' : 'User'}`;
  } catch (e) {
    text = 'Guest';
  }
  const badge = document.getElementById('userBadge');
  if (badge) badge.innerText = text;
}

function listActionsForPage(currentName, row) {
  const baseActions = (() => {
    if (currentName === 'proteins') return r => `<button class="btn small" onclick="showProteinCond(${r.protein_id})">Condensates</button>`;
    if (currentName === 'kinases') return r => `<button class="btn small" onclick="showSeq(${r.protein_id})">Sequence</button>`;
    if (currentName === 'condensates') return r => `<button class="btn small" onclick="showCondProteins(${r.condensate_id})">Proteins/Kinases</button> <button class="btn small" onclick="showCondDiseases(${r.condensate_id})">Diseases</button>`;
    if (currentName === 'diseases') return r => `<button class="btn small" onclick="showDiseaseCond(${r.disease_id})">Evidence</button>`;
    if (currentName === 'cmods') return r => `<button class="btn small" onclick="showCmodCond(${r.cmod_id})">Affected Condensates</button>`;
    if (currentName === 'publications') return r => `<button class="btn small" onclick="showPmid('${r.pmid}')">Evidence</button>`;
    if (currentName === 'advanced') return r => `<button class="btn small" onclick="showProteinCond(${r.protein_id})">Condensates</button>`;
    return null;
  })();
  const utility = `<button class="btn small" onclick="expandRow(this, '${currentName} Record')">Expand</button><button class="btn warn small" onclick="copyRow(this)">Copy</button>`;
  return `${baseActions ? baseActions(row) : ''} ${utility}`;
}

function renderError(target, msg) {
  if (!target) return;
  target.innerHTML = `<div class="error-state">Request failed: ${esc(msg || 'Unknown error')}</div>`;
}

function renderLoading(target) {
  if (!target) return;
  target.innerHTML = `<div class="loading-state">Loading data...</div>`;
}

function page(title, name, tip) {
  current = name;
  state.page = 1;
  setNav(name);
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `<div class="card"><h2>${title}</h2><p>${tip || ''}</p><div class="toolbar"><input id="kw" class="input" placeholder="Enter keywords"><button class="btn primary" onclick="loadList(1)">Search</button><button class="btn" onclick="exportUrl('${name}')">Export Excel</button></div><div id="list"></div></div>`;
  loadList(1);
}

async function loadList(p = 1) {
  state.page = p;
  const kw = document.getElementById('kw')?.value || '';
  const listEl = document.getElementById('list');
  if (!listEl || !cols[current]) return;
  renderLoading(listEl);
  try {
    const data = await api(`/api/${current}?page=${state.page}&size=${state.size}&keyword=${encodeURIComponent(kw)}`);
    state.total = data.total || 0;
    const hasData = (data.items || []).length > 0;
    if (!hasData) {
      listEl.innerHTML = '<div class="empty-state">No records match your current filter. Try different keywords.</div>';
      return;
    }
    listEl.innerHTML = `${tableHtml(cols[current], data.items, r => listActionsForPage(current, r)}${pagerHtml(state)}`;
  } catch (e) {
    renderError(listEl, e.message);
  }
}

async function optionHtml(name, placeholder) {
  const rows = await api(`/api/options/${name}`);
  return `<option value="">${placeholder}</option>` + rows.map(o => `<option value="${esc(o.value)}">${esc(o.label)} (${esc(o.value)})</option>`).join('');
}

async function advancedSearch() {
  current = 'advanced';
  state.page = 1;
  setNav('advanced');
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `<div class="card"><h2>Advanced Search</h2><p>Search by protein name, then narrow by condensate, disease, chemical modification, or publication evidence.</p><div class="grid"><div class="form-row"><label>Search by protein name</label><input id="advProteinName" class="input" placeholder="Protein name keyword"></div><div class="form-row"><label>Filter by condensate</label><select id="advCondensate" class="input"><option>Loading...</option></select></div><div class="form-row"><label>Filter by disease</label><select id="advDisease" class="input"><option>Loading...</option></select></div><div class="form-row"><label>Filter by chemical modification</label><select id="advCmod" class="input"><option>Loading...</option></select></div><div class="form-row"><label>Filter by publication</label><select id="advPmid" class="input"><option>Loading...</option></select></div></div><div class="toolbar"><button class="btn primary" onclick="loadAdvanced(1)">Search</button><button class="btn" onclick="clearAdvanced()">Clear</button></div><div id="list"></div></div>`;
  const list = document.getElementById('list');
  if (list) renderLoading(list);
  try {
    const [condensates, diseases, cmods, p] = await Promise.all([
      optionHtml('condensates', 'All Condensates'),
      optionHtml('diseases', 'All Diseases'),
      optionHtml('cmods', 'All Chemical Modifications'),
      optionHtml('publications', 'All Publications')
    ]);
    document.getElementById('advCondensate').innerHTML = condensates;
    document.getElementById('advDisease').innerHTML = diseases;
    document.getElementById('advCmod').innerHTML = cmods;
    document.getElementById('advPmid').innerHTML = p;
    loadAdvanced(1);
  } catch (e) {
    if (list) renderError(list, e.message);
  }
}

async function loadAdvanced(p = 1) {
  state.page = p;
  const list = document.getElementById('list');
  if (!list) return;
  renderLoading(list);
  try {
    const params = new URLSearchParams({
      page: state.page,
      size: state.size,
      protein_name: document.getElementById('advProteinName')?.value || '',
      condensate_id: document.getElementById('advCondensate')?.value || '',
      disease_id: document.getElementById('advDisease')?.value || '',
      cmod_id: document.getElementById('advCmod')?.value || '',
      pmid: document.getElementById('advPmid')?.value || ''
    });
    const data = await api(`/api/search/advanced?${params.toString()}`);
    state.total = data.total || 0;
    if (!(data.items || []).length) {
      list.innerHTML = '<div class="empty-state">No records match these filters.</div>';
      return;
    }
    list.innerHTML = `${tableHtml(cols.advanced, data.items, r => listActionsForPage('advanced', r)}${advancedPagerHtml(state)}`;
  } catch (e) {
    renderError(list, e.message);
  }
}

function advancedPagerHtml(s) {
  const totalPages = Math.max(Math.ceil(s.total / s.size) || 1, 1);
  return `<div class="pagination"><button class="btn small" ${s.page <= 1 ? 'disabled' : ''} onclick="loadAdvanced(${s.page - 1})">Previous</button><span>Page ${s.page} / ${totalPages}, Total ${s.total}</span><button class="btn small" ${s.page >= totalPages ? 'disabled' : ''} onclick="loadAdvanced(${s.page + 1})">Next</button></div>`;
}

function clearAdvanced() {
  ['advProteinName', 'advCondensate', 'advDisease', 'advCmod', 'advPmid'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  loadAdvanced(1);
}

async function showProteinCond(id) {
  try {
    const rows = await api(`/api/proteins/${id}/condensates`);
    showModal('Condensates associated with this protein', tableHtml(cols.condensates, rows));
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function showCondProteins(id) {
  try {
    const rows = await api(`/api/condensates/${id}/proteins`);
    showModal('Proteins / kinases in this condensate', tableHtml(cols.proteins, rows));
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function showCondDiseases(id) {
  try {
    const rows = await api(`/api/condensates/${id}/diseases`);
    showModal('Disease associations', tableHtml([['disease_name', 'Disease Name'], ['dysregulation_type', 'Dysregulation Type'], ['condensate_markers', 'Condensate Markers'], ['pmid', 'PubMed PMID']], rows));
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function showDiseaseCond(id) {
  try {
    const rows = await api(`/api/diseases/${id}/condensates`);
    showModal('Disease evidence', tableHtml([['condensate_name', 'Condensate'], ['dysregulation_type', 'Dysregulation Type'], ['condensate_markers', 'Condensate Markers'], ['pmid', 'PubMed PMID']], rows));
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function showCmodCond(id) {
  try {
    const rows = await api(`/api/cmods/${id}/condensates`);
    showModal('Condensates affected by this chemical modifier', tableHtml(cols.condensates.concat([['pmid', 'PMID']]), rows));
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function showSeq(id) {
  try {
    const data = await api('/api/kinases?keyword=&page=1&size=100');
    const k = data.items.find(x => x.protein_id == id);
    showModal('Protein Sequence', `<div class="seq">${esc(k?.sequence || 'No sequence found')}</div>`);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function showPmid(pmid) {
  try {
    const d = await api(`/api/publications/${encodeURIComponent(pmid)}/evidence`);
    showModal('PubMed Evidence', `<h3>Condensate-Disease Relations</h3>${tableHtml([['condensate_name', 'Condensate'], ['disease_name', 'Disease'], ['dysregulation_type', 'Dysregulation'], ['condensate_markers', 'Markers'], ['pmid', 'PMID']], d.disease_relations)}<h3>Condensate-Chemical Modifier Relations</h3>${tableHtml([['condensate_name', 'Condensate'], ['cmod_name', 'Chemical Modifier'], ['pmid', 'PMID']], d.cmod_relations)}`);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function homeQuickCard(card) {
  return `<button class="quick-card btn" onclick="${card.cmd}"><strong>${card.title}</strong><div class="muted">${card.detail}</div></button>`;
}

function home() {
  current = 'home';
  setNav('home');
  const app = document.getElementById('app');
  if (!app) return;
  const quickCards = HOME_CARDS.map(homeQuickCard).join('');
  app.innerHTML = `<div class="hero"><h1>CondensateDB Query Portal</h1><p>An integrated platform for biomolecular condensates, proteins, kinases, diseases, chemical modifiers, and PubMed evidence.</p></div><div id="stats" class="grid"></div><div class="card"><h2>Primary Use Cases</h2><div class="quick-list">${quickCards}</div></div>`;
  loadStats();
}

async function loadStats() {
  const card = document.getElementById('stats');
  if (!card) return;
  card.innerHTML = `<div class="loading-state">Loading dashboard stats...</div>`;
  try {
    const s = await api('/api/stats/summary');
    card.innerHTML = Object.entries({
      'Proteins': s.protein_total,
      'Kinases': s.kinase_total,
      'Condensates': s.condensate_total,
      'Diseases': s.disease_total,
      'Publications': s.publication_total,
      'Chemical Modifiers': s.cmod_total
    }).map(([k, v]) => `<div class="stat metric-card"><span>${k}</span><br><b>${v}</b><div class="muted">Updated now</div></div>`).join('');
  } catch (e) {
    card.innerHTML = `<div class="error-state">Failed to load dashboard stats.</div>`;
  }
}

function complex() {
  setNav('complex');
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `<div class="card"><h2>Integrated Query</h2><div class="tabs"><button class="btn primary" onclick="advancedSearch()">Advanced Search</button><button class="btn primary" onclick="page('Chemical Modifier Query','cmods','Query C-mod information and view affected condensates')">Chemical Modifier Query</button><button class="btn primary" onclick="page('Literature Evidence Query','publications','Search evidence by PubMed PMID')">Literature Evidence Query</button><button class="btn primary" onclick="charts()">Statistical Charts</button><button class="btn primary" onclick="network()">Network Graph</button></div></div><div id="complexBox"></div>`;
}

function chartBaseOption(title) {
  return {
    title: { text: title, left: 'center', textStyle: { color: '#0f172a' } },
    tooltip: { trigger: 'item' },
    grid: { left: 56, right: 20, top: 40, bottom: 40, containLabel: true },
    textStyle: { fontFamily: 'Inter,Arial', color: '#0f172a' }
  };
}

function drawPie(id, title, data) {
  const box = document.getElementById(id);
  if (!box || !window.echarts) return;
  echarts.init(box).setOption({
    ...chartBaseOption(title),
    series: [{ type: 'pie', radius: '62%', label: { color: '#334155' }, data: data || [] }]
  });
}

function drawBar(id, title, data) {
  const box = document.getElementById(id);
  if (!box || !window.echarts) return;
  echarts.init(box).setOption({
    ...chartBaseOption(title),
    xAxis: { type: 'category', data: (data || []).map(x => x.name), axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: (data || []).map(x => x.value), itemStyle: { borderRadius: [6, 6, 0, 0] } }]
  });
}

async function charts() {
  const panel = document.getElementById('complexBox');
  if (!panel) return;
  panel.innerHTML = `<div class="card chart-panel"><div class="chart-head"><h3>Statistical Charts</h3><div class="btn-group"><button class="btn primary" onclick="loadCharts()">Reload</button><button class="btn" onclick="clearCharts()">Clear</button></div></div><div class="charts"><div class="card chart" id="c1"></div><div class="card chart" id="c2"></div><div class="card chart" id="c3"></div><div class="card chart" id="c4"></div><div class="card chart" id="c5"></div></div></div>`;
  await loadCharts();
}

async function loadCharts() {
  const panel = document.getElementById('complexBox');
  if (!panel) return;
  try {
    const d = await api('/api/stats/charts');
    drawPie('c1', 'Condensate Count by Type', d.condensate_type);
    drawBar('c2', 'Disease-Associated Condensate Count', d.disease_rank);
    drawBar('c3', 'Condensate Count by Species', d.species_count);
    drawPie('c4', 'Chemical Modifier Type Count', d.cmod_type);
    drawBar('c5', 'Top Proteins by Condensate Associations', d.protein_rank);
  } catch (e) {
    panel.innerHTML = `<div class="card"><div class="error-state">Chart load failed: ${esc(e.message || 'Unknown error')}</div></div>`;
  }
}

function clearCharts() {
  ['c1','c2','c3','c4','c5'].forEach(id => {
    const n = document.getElementById(id);
    if (n) n.innerHTML = '<div class="empty-state">Cleared</div>';
  });
}

function network() {
  current = 'network';
  setNav('network');
  const app = document.getElementById('app');
  if (!app) return;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(NETWORK_PREF_KEY) || '{}'); } catch (e) {}
  app.innerHTML = `
    <div class="card">
      <h2>Interactive Network Graph</h2>
      <p>Explore protein-condensate, condensate-disease, and condensate-chemical modifier relationships.</p>
      <div class="toolbar">
        <input id="networkKw" class="input" placeholder="Try 'BRD4', 'EGFR', 'FUS'" value="${esc(saved.keyword || '')}" onkeydown="if(event.key==='Enter') loadNetwork()">
        <select id="networkMode" class="input network-select">
          <option value="all"${saved.mode === 'all' ? ' selected' : ''}>All relation types</option>
          <option value="protein_condensate"${saved.mode === 'protein_condensate' ? ' selected' : ''}>Protein ↔ Condensate</option>
          <option value="condensate_disease"${saved.mode === 'condensate_disease' ? ' selected' : ''}>Condensate ↔ Disease</option>
          <option value="condensate_cmod"${saved.mode === 'condensate_cmod' ? ' selected' : ''}>Condensate ↔ Chemical Modifier</option>
        </select>
        <select id="networkLimit" class="input network-select">
          <option value="40"${saved.limit === 40 ? ' selected' : ''}>40 relations each type</option>
          <option value="80"${(saved.limit || 80) === 80 ? ' selected' : ''}>80 relations each type</option>
          <option value="150"${saved.limit === 150 ? ' selected' : ''}>150 relations each type</option>
          <option value="300"${saved.limit === 300 ? ' selected' : ''}>300 relations each type</option>
        </select>
        <button class="btn primary" onclick="loadNetwork()">Load Graph</button>
      </div>
      <div class="toolbar">
        <span class="muted">Tip: if keyword is empty, try one of: ${NETWORK_HINTS.map(h => `<strong>${esc(h)}</strong>`).join(', ')}</span>
      </div>
      <div class="network-wrap">
        <div id="cy"></div>
        <div class="network-panel">
          <h3>Graph Summary</h3>
          <div id="networkSummary" class="muted">Ready</div>
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

function saveNetworkPref() {
  const mode = document.getElementById('networkMode')?.value || 'all';
  const limit = Number(document.getElementById('networkLimit')?.value || 80);
  const keyword = (document.getElementById('networkKw')?.value || '').trim();
  localStorage.setItem(NETWORK_PREF_KEY, JSON.stringify({ mode, limit, keyword }));
}

async function loadNetwork() {
  const canvas = document.getElementById('cy');
  const summary = document.getElementById('networkSummary');
  if (!canvas || typeof cytoscape === 'undefined') {
    if (canvas) canvas.innerHTML = '<div class="empty-graph">Cytoscape.js was not loaded. Please check the CDN or try again later.</div>';
    return;
  }
  summary.innerHTML = 'Loading network graph...';
  const kw = encodeURIComponent((document.getElementById('networkKw')?.value || '').trim());
  const mode = document.getElementById('networkMode')?.value || 'all';
  const limit = document.getElementById('networkLimit')?.value || '80';
  saveNetworkPref();

  try {
    const data = await api(`/api/network?keyword=${kw}&mode=${mode}&limit=${limit}`);
    summary.innerHTML = `Nodes: <b>${data.summary.node_count}</b><br>Edges: <b>${data.summary.edge_count}</b><br>Mode: <b>${esc(data.summary.mode)}</b><br>Relation limit: <b>${esc(data.summary.limit)}</b>`;
    if (!data.elements || !data.elements.length) {
      canvas.innerHTML = `<div class="empty-graph">No network data found. Try another keyword or relation type.</div>`;
      document.getElementById('nodeDetails').innerHTML = 'No item selected.';
      return;
    }

    const cy = cytoscape({
      container: canvas,
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
          'width': 'mapData(weight, 1, 30, 34, 82)',
          'height': 'mapData(weight, 1, 30, 34, 82)',
          'background-color': '#94a3b8',
          'border-width': 2,
          'border-color': '#ffffff',
          'background-opacity': 0.98
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
      layout: { name: 'cose', animate: true, fit: true, padding: 40, randomize: false, nodeRepulsion: 8000, idealEdgeLength: 110 }
    });

    const getValue = (v) => v == null ? '' : esc(v);
    cy.on('tap', 'node, edge', evt => {
      const d = evt.target.data();
      const detail = Object.entries(d)
        .filter(([k, v]) => !['id', 'source', 'target', 'weight'].includes(k) && v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `<div class="detail-row"><b>${k.replaceAll('_', ' ')}</b><br>${k === 'pmid' ? renderPmidLinks(v) : getValue(v)}</div>`)
        .join('');
      document.getElementById('nodeDetails').innerHTML = detail || 'No details available.';
    });
    cy.on('tap', evt => {
      if (evt.target === cy) {
        document.getElementById('nodeDetails').innerHTML = 'Click a node or edge to view details.';
      }
    });
  } catch (e) {
    summary.innerHTML = `Load failed: ${esc(e.message || 'Unknown error')}`;
    canvas.innerHTML = '<div class="empty-graph">Could not render network with current result set.</div>';
  }
}

function renderDetailValue(k, v) {
  if (k === 'uniprot_accession') return `<a href="${uniprotUrl(v)}" target="_blank" rel="noopener">${esc(v)}</a>`;
  if (k === 'pmid') return renderPmidLinks(v);
  return esc(v);
}

function homeInit() {
  setUserBadge();
  home();
}

homeInit();
