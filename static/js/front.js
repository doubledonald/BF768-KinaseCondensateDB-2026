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
  const data = await api(`/api/${current}?page=${state.page}&size=${state.size}&keyword=${encodeURIComponent(kw)}`);
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

async function optionHtml(name, placeholder) {
  const rows = await api(`/api/options/${name}`);
  return `<option value="">${placeholder}</option>` + rows.map(o => `<option value="${esc(o.value)}">${esc(o.label)} (${esc(o.value)})</option>`).join('');
}

async function advancedSearch() {
  current = 'advanced';
  state.page = 1;
  setNav('advanced');
  document.getElementById('app').innerHTML = `<div class="card"><h2>Advanced Search</h2><p>Search by protein name, then narrow results by condensate, disease, chemical modification, or publication evidence.</p><div class="grid"><div class="form-row"><label>Search by protein name</label><input id="advProteinName" class="input" placeholder="Protein name keyword"></div><div class="form-row"><label>Filter by condensate</label><select id="advCondensate" class="input"><option>Loading...</option></select></div><div class="form-row"><label>Filter by disease</label><select id="advDisease" class="input"><option>Loading...</option></select></div><div class="form-row"><label>Filter by chemical modification</label><select id="advCmod" class="input"><option>Loading...</option></select></div><div class="form-row"><label>Filter by publication</label><select id="advPmid" class="input"><option>Loading...</option></select></div></div><div class="toolbar"><button class="btn primary" onclick="loadAdvanced(1)">Search</button><button class="btn" onclick="clearAdvanced()">Clear</button></div><div id="list"></div></div>`;
  document.getElementById('advCondensate').innerHTML = await optionHtml('condensates', 'All Condensates');
  document.getElementById('advDisease').innerHTML = await optionHtml('diseases', 'All Diseases');
  document.getElementById('advCmod').innerHTML = await optionHtml('cmods', 'All Chemical Modifications');
  document.getElementById('advPmid').innerHTML = await optionHtml('publications', 'All Publications');
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
  const data = await api(`/api/search/advanced?${params.toString()}`);
  state.total = data.total;
  const actions = r => `<button class="btn small" onclick="showProteinCond(${r.protein_id})">Condensates</button>`;
  document.getElementById('list').innerHTML = tableHtml(cols.advanced, data.items, actions) + advancedPagerHtml(state);
}

function advancedPagerHtml(s) {
  return `<div class="pagination"><button class="btn small" ${s.page <= 1 ? 'disabled' : ''} onclick="loadAdvanced(${s.page - 1})">Previous</button><span>Page ${s.page} / ${Math.ceil(s.total / s.size) || 1}, Total ${s.total}</span><button class="btn small" ${s.page >= Math.ceil(s.total / s.size) ? 'disabled' : ''} onclick="loadAdvanced(${s.page + 1})">Next</button></div>`;
}

function clearAdvanced() {
  ['advProteinName', 'advCondensate', 'advDisease', 'advCmod', 'advPmid'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  loadAdvanced(1);
}

async function showProteinCond(id) {
  const rows = await api(`/api/proteins/${id}/condensates`);
  showModal('Condensates associated with this protein', tableHtml(cols.condensates, rows));
}
async function showCondProteins(id) {
  const rows = await api(`/api/condensates/${id}/proteins`);
  showModal('Proteins / kinases in this condensate', tableHtml(cols.proteins, rows));
}
async function showCondDiseases(id) {
  const rows = await api(`/api/condensates/${id}/diseases`);
  showModal('Disease associations', tableHtml([['disease_name', 'Disease Name'], ['dysregulation_type', 'Dysregulation Type'], ['condensate_markers', 'Condensate Markers'], ['pmid', 'PubMed PMID']], rows));
}
async function showDiseaseCond(id) {
  const rows = await api(`/api/diseases/${id}/condensates`);
  showModal('Disease evidence', tableHtml([['condensate_name', 'Condensate'], ['dysregulation_type', 'Dysregulation Type'], ['condensate_markers', 'Condensate Markers'], ['pmid', 'PubMed PMID']], rows));
}
async function showCmodCond(id) {
  const rows = await api(`/api/cmods/${id}/condensates`);
  showModal('Condensates affected by this chemical modifier', tableHtml(cols.condensates.concat([['pmid', 'PMID']]), rows));
}
async function showSeq(id) {
  const data = await api(`/api/kinases?keyword=&page=1&size=100`);
  const k = data.items.find(x => x.protein_id == id);
  showModal('Protein Sequence', `<div class="seq">${esc(k?.sequence || 'No sequence found')}</div>`);
}
async function showPmid(pmid) {
  const d = await api(`/api/publications/${encodeURIComponent(pmid)}/evidence`);
  showModal('PubMed Evidence', `<h3>Condensate-Disease Relations</h3>${tableHtml([['condensate_name', 'Condensate'], ['disease_name', 'Disease'], ['dysregulation_type', 'Dysregulation'], ['condensate_markers', 'Markers'], ['pmid', 'PMID']], d.disease_relations)}<h3>Condensate-Chemical Modifier Relations</h3>${tableHtml([['condensate_name', 'Condensate'], ['cmod_name', 'Chemical Modifier'], ['pmid', 'PMID']], d.cmod_relations)}`);
}

function home() {
  current = 'home';
  setNav('home');
  document.getElementById('app').innerHTML = `<div class="hero"><h1>CondensateDB Query Portal</h1><p>An integrated platform for biomolecular condensates, proteins, kinases, diseases, chemical modifiers, and PubMed evidence.</p></div><div class="grid" id="stats"></div><div class="card"><h2>Primary Use Cases</h2><div class="quick-list"><button class="btn primary quick" onclick="advancedSearch()">Advanced Search: protein name + condensate / disease / chemical modification / publication filters</button><button class="btn primary quick" onclick="page('Protein Information','proteins','Which biomolecular condensates is a human kinase associated with? What are the condensate types and confidence scores?')">Human kinase → associated condensates, types and confidence scores</button><button class="btn primary quick" onclick="page('Condensate Information','condensates','Which human kinases are contained in a specific condensate? What are their UniProt accessions, gene names, and sequence lengths?')">Condensate → contained human kinases and sequence metadata</button><button class="btn primary quick" onclick="page('Condensate Information','condensates','Which biomolecular condensates are associated with a disease or dysregulation type? What PubMed PMIDs support these associations?')">Disease / dysregulation → condensates and supporting PMIDs</button><button class="btn primary quick" onclick="network()">Interactive Network Graph: protein-condensate-disease-C-mod relationships</button></div></div>`;
  loadStats();
}
async function loadStats() {
  const s = await api('/api/stats/summary');
  stats.innerHTML = Object.entries({ 'Proteins': s.protein_total, 'Kinases': s.kinase_total, 'Condensates': s.condensate_total, 'Diseases': s.disease_total }).map(([k, v]) => `<div class="stat"><span>${k}</span><br><b>${v}</b></div>`).join('');
}
function complex() {
  setNav('complex');
  document.getElementById('app').innerHTML = `<div class="card"><h2>Integrated Query</h2><div class="tabs"><button class="btn primary" onclick="advancedSearch()">Advanced Search</button><button class="btn primary" onclick="page('Chemical Modifier Query','cmods','Query C-mod information and view affected condensates')">Chemical Modifier Query</button><button class="btn primary" onclick="page('Literature Evidence Query','publications','Search evidence by PubMed PMID')">Literature Evidence Query</button><button class="btn primary" onclick="charts()">Statistical Charts</button><button class="btn primary" onclick="network()">Network Graph</button></div></div><div id="complexBox"></div>`;
}
async function charts() {
  document.getElementById('complexBox').innerHTML = '<div class="charts"><div class="card chart" id="c1"></div><div class="card chart" id="c2"></div><div class="card chart" id="c3"></div><div class="card chart" id="c4"></div><div class="card chart" id="c5"></div></div>';
  const d = await api('/api/stats/charts');
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
  const data = await api(`/api/network?keyword=${kw}&mode=${mode}&limit=${limit}`);
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
