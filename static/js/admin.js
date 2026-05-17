checkLogin();
let current = 'users', state = { page: 1, size: 10, total: 0 };

const config = {
  users: { title: 'User Management', pk: 'user_id', cols: [['user_id', 'ID'], ['username', 'Username'], ['gender', 'Gender'], ['phone', 'Phone'], ['email', 'Email'], ['role', 'Role'], ['status', 'Status'], ['create_time', 'Created At']], fields: ['username', 'password', 'gender', 'phone', 'email'] },
  proteins: { title: 'Protein Management', pk: 'protein_id', cols: [['protein_id', 'ID'], ['uniprot_accession', 'UniProt Accession'], ['gene_name', 'Gene'], ['protein_name', 'Protein Name'], ['species_name', 'Species'], ['biomolecular_condensate_count', 'Biomolecular Count'], ['synthetic_condensate_count', 'Synthetic Count']], fields: ['uniprot_accession', 'gene_name', 'protein_name', 'species_name', 'biomolecular_condensate_count', 'synthetic_condensate_count'] },
  kinases: { title: 'Kinase Management', pk: 'protein_id', cols: [['protein_id', 'Protein ID'], ['entry_name', 'Entry'], ['uniprot_accession', 'UniProt Accession'], ['gene_name', 'Gene'], ['organism_name', 'Organism'], ['sequence_length', 'Length'], ['reviewed_flag', 'Reviewed']], fields: ['protein_id', 'entry_name', 'organism_name', 'sequence_length', 'sequence', 'reviewed_flag'] },
  condensates: { title: 'Condensate Management', pk: 'condensate_id', cols: [['condensate_id', 'ID'], ['condensate_uid', 'UID'], ['condensate_name', 'Name'], ['condensate_type', 'Type'], ['species_tax_id', 'Species Tax ID'], ['proteins_count', 'Protein Count'], ['has_dna', 'DNA'], ['has_rna', 'RNA'], ['has_cmods', 'C-mods'], ['has_condensatopathy', 'Disease'], ['confidence_score', 'Score']], fields: ['condensate_uid', 'condensate_name', 'condensate_type', 'species_tax_id', 'proteins_count', 'has_dna', 'has_rna', 'has_cmods', 'has_condensatopathy', 'confidence_score'] },
  diseases: { title: 'Disease Management', pk: 'disease_id', cols: [['disease_id', 'ID'], ['disease_name', 'Disease Name']], fields: ['disease_name'] },
  cmods: { title: 'Chemical Modifier Management', pk: 'cmod_id', cols: [['cmod_id', 'ID'], ['cmod_name', 'Name'], ['biomolecular_type', 'Biomolecular Type'], ['phenotypic_class', 'Phenotypic Class']], fields: ['cmod_name', 'biomolecular_type', 'phenotypic_class'] },
  publications: { title: 'Publication Management', pk: 'pmid', cols: [['pmid', 'PMID']], fields: ['pmid'] },
  'admin-logs': { title: 'Admin Operation Logs', pk: 'log_id', cols: [['log_id', 'Log ID'], ['admin_user', 'Admin User'], ['action_type', 'Action'], ['target_table', 'Target Table'], ['target_id', 'Target ID'], ['timestamp', 'Timestamp']], fields: [] }
};

const fieldLabels = { username: 'Username', password: 'Password', gender: 'Gender', phone: 'Phone', email: 'Email', protein_id: 'Protein', entry_name: 'Entry Name', organism_name: 'Organism', sequence_length: 'Sequence Length', sequence: 'Sequence', reviewed_flag: 'Reviewed' };

function switchMenu(n) {
  current = n;
  document.querySelectorAll('.side-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('side-' + n)?.classList.add('active');
  state.page = 1;
  renderManage();
}

function renderManage() {
  const c = config[current];
  const isLog = current === 'admin-logs';
  const extraFilters = isLog ? `<select id="actionType" class="input"><option value="">All Actions</option><option value="CREATE">CREATE</option><option value="UPDATE">UPDATE</option><option value="DELETE">DELETE</option></select><input id="targetTable" class="input" placeholder="Target table">` : '';
  const addBtn = isLog ? '' : `<button class="btn primary" onclick="openForm()">Add</button><button class="btn" onclick="exportUrl('${current}')">Export Excel</button>`;
  document.getElementById('main').innerHTML = `<div class="card"><h2>${c.title}</h2><div class="toolbar"><input id="kw" class="input" placeholder="Keyword search">${extraFilters}<button class="btn primary" onclick="loadList(1)">Search</button>${addBtn}</div><div id="list"></div></div>`;
  loadList(1);
}

async function loadList(p = 1) {
  state.page = p;
  const kw = document.getElementById('kw')?.value || '';
  let url = `/api/${current}?page=${p}&size=${state.size}&keyword=${encodeURIComponent(kw)}`;
  if (current === 'admin-logs') {
    url += `&action_type=${encodeURIComponent(document.getElementById('actionType')?.value || '')}&target_table=${encodeURIComponent(document.getElementById('targetTable')?.value || '')}`;
  }
  const data = await api(url);
  state.total = data.total;
  const c = config[current];
  let actions = null;
  if (current !== 'admin-logs') {
    actions = r => {
      let s = `<button class="btn small" onclick='openForm(${JSON.stringify(r).replace(/'/g, "&#39;")})'>Edit</button> <button class="btn danger small" onclick="delRow('${r[c.pk]}')">Delete</button>`;
      if (current === 'users') s += ` <button class="btn warn small" onclick="toggleUser('${r.user_id}',${r.status})">${r.status == 1 ? 'Disable' : 'Enable'}</button>`;
      if (current === 'proteins') s += ` <button class="btn small" onclick="managePC(${r.protein_id})">Condensates</button>`;
      if (current === 'condensates') s += ` <button class="btn small" onclick="manageCC(${r.condensate_id})">C-mods</button> <button class="btn small" onclick="manageCD(${r.condensate_id})">Diseases</button>`;
      return s;
    };
  }
  document.getElementById('list').innerHTML = tableHtml(c.cols, data.items, actions) + pagerHtml(state);
}

async function selectOptions(name, selected) {
  const rows = await api(`/api/options/${name}`);
  return rows.map(o => `<option value="${esc(o.value)}" ${String(o.value) === String(selected) ? 'selected' : ''}>${esc(o.label)} (${esc(o.value)})</option>`).join('');
}

async function openForm(row = null) {
  if (current === 'admin-logs') return;
  const c = config[current];
  let html = `<div class="grid">`;
  for (const f of c.fields) {
    const v = row?.[f] ?? '';
    if (current === 'kinases' && f === 'protein_id' && !row) {
      html += `<div class="form-row"><label>Protein</label><select id="f_${f}" class="input">${await selectOptions('proteins', v)}</select></div>`;
    } else if (f === 'status' || f.startsWith('has_') || f === 'reviewed_flag') {
      html += field(f, row?.[f] ?? 1, ['1', '0']);
    } else {
      html += `<div class="form-row"><label>${fieldLabels[f] || f}</label><textarea id="f_${f}" class="input">${esc(v)}</textarea></div>`;
    }
  }
  html += `</div><button class="btn primary" onclick="saveForm('${row ? row[c.pk] : ''}')">Save</button>`;
  showModal(row ? 'Edit Record' : 'Add Record', html);
}

function field(f, v, opts) {
  return `<div class="form-row"><label>${fieldLabels[f] || f}</label><select id="f_${f}" class="input">${opts.map(o => `<option value="${o}" ${String(v) === String(o) ? 'selected' : ''}>${o == 1 ? 'Yes' : 'No'}</option>`).join('')}</select></div>`;
}

async function saveForm(id) {
  const c = config[current], data = {};
  c.fields.forEach(f => data[f] = document.getElementById('f_' + f)?.value);
  if (current === 'users') { data.role = 'user'; data.status = 1; }
  try {
    await api(`/api/${current}${id ? '/' + id : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) });
    closeModal();
    loadList(state.page);
  } catch (e) { alert(e.message); }
}

async function delRow(id) {
  if (!confirm('Delete this record?')) return;
  try { await api(`/api/${current}/${id}`, { method: 'DELETE' }); loadList(state.page); } catch (e) { alert(e.message); }
}

async function toggleUser(id, status) {
  if (!confirm(status == 1 ? 'Disable this user?' : 'Enable this user?')) return;
  await api(`/api/users/${id}/toggle`, { method: 'PUT' });
  loadList(state.page);
}

async function managePC(pid) {
  const rows = await api(`/api/proteins/${pid}/condensates`);
  showModal('Maintain Protein-Condensate Relations', `<div class="toolbar"><input id="rel_cid" class="input" placeholder="Condensate ID"><button class="btn primary" onclick="addPC(${pid})">Add Relation</button></div>${tableHtml([['protein_condensate_id', 'Relation ID'], ['condensate_id', 'Condensate ID'], ['condensate_uid', 'UID'], ['condensate_name', 'Name'], ['evidence_source', 'Evidence Source']], rows, r => `<button class="btn danger small" onclick="delRel('/api/relations/protein-condensate/${r.protein_condensate_id}',()=>managePC(${pid}))">Delete</button>`)}`);
}
async function addPC(pid) { await api('/api/relations/protein-condensate', { method: 'POST', body: JSON.stringify({ protein_id: pid, condensate_id: rel_cid.value, evidence_source: 'manual' }) }); managePC(pid); }

async function manageCC(cid) {
  const rows = await api(`/api/condensates/${cid}/cmods`);
  showModal('Maintain Condensate-Chemical Modifier Relations', `<div class="toolbar"><input id="rel_mid" class="input" placeholder="C-mod ID"><input id="rel_pmid" class="input" placeholder="PMID"><button class="btn primary" onclick="addCC(${cid})">Add Relation</button></div>${tableHtml([['condensate_cmod_id', 'Relation ID'], ['cmod_id', 'C-mod ID'], ['cmod_name', 'Chemical Modifier'], ['biomolecular_type', 'Biomolecular Type'], ['phenotypic_class', 'Phenotypic Class'], ['pmid', 'PMID']], rows, r => `<button class="btn danger small" onclick="delRel('/api/relations/condensate-cmod/${r.condensate_cmod_id}',()=>manageCC(${cid}))">Delete</button>`)}`);
}
async function addCC(cid) { await api('/api/relations/condensate-cmod', { method: 'POST', body: JSON.stringify({ condensate_id: cid, cmod_id: rel_mid.value, pmid: rel_pmid.value || null }) }); manageCC(cid); }

async function manageCD(cid) {
  const rows = await api(`/api/condensates/${cid}/diseases`);
  showModal('Maintain Condensate-Disease Relations', `<div class="toolbar"><input id="rel_did" class="input" placeholder="Disease ID"><input id="rel_pmid" class="input" placeholder="PMID"></div><textarea id="rel_dys" class="input" placeholder="Dysregulation description"></textarea><br><br><textarea id="rel_marker" class="input" placeholder="Condensate markers"></textarea><br><br><button class="btn primary" onclick="addCD(${cid})">Add Relation</button><p>Dysregulation descriptions, condensate markers, and PMID evidence IDs are maintained here.</p>${tableHtml([['condensate_disease_id', 'Relation ID'], ['disease_id', 'Disease ID'], ['disease_name', 'Disease Name'], ['dysregulation_type', 'Dysregulation Type'], ['condensate_markers', 'Markers'], ['pmid', 'PMID']], rows, r => `<button class="btn danger small" onclick="delRel('/api/relations/condensate-disease/${r.condensate_disease_id}',()=>manageCD(${cid}))">Delete</button>`)}`);
}
async function addCD(cid) { await api('/api/relations/condensate-disease', { method: 'POST', body: JSON.stringify({ condensate_id: cid, disease_id: rel_did.value, pmid: rel_pmid.value || null, dysregulation_type: rel_dys.value, condensate_markers: rel_marker.value }) }); manageCD(cid); }
async function delRel(url, cb) { if (confirm('Delete this relation?')) { await api(url, { method: 'DELETE' }); cb(); } }

async function dashboard() {
  current = 'dashboard';
  document.querySelectorAll('.side-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('side-dashboard').classList.add('active');
  const s = await api('/api/stats/summary');
  main.innerHTML = `<div class="card"><h2>Statistics</h2><div class="grid">${Object.entries({ 'Proteins': s.protein_total, 'Kinases': s.kinase_total, 'Condensates': s.condensate_total, 'Diseases': s.disease_total, 'Publications': s.publication_total, 'Chemical Modifiers': s.cmod_total, 'Total Users': s.user_total, 'Standard Users': s.normal_user_total, 'Administrators': s.admin_total, 'Disabled Users': s.disabled_user_total }).map(([k, v]) => `<div class="stat"><span>${k}</span><br><b>${v}</b></div>`).join('')}</div></div><div class="charts"><div class="card chart" id="c1"></div><div class="card chart" id="c2"></div></div>`;
  const d = await api('/api/stats/charts');
  echarts.init(c1).setOption({ title: { text: 'Condensate Count by Type' }, tooltip: {}, series: [{ type: 'pie', data: d.condensate_type }] });
  echarts.init(c2).setOption({ title: { text: 'Top Proteins by Condensate Associations' }, xAxis: { type: 'category', data: d.protein_rank.map(x => x.name), axisLabel: { rotate: 30 } }, yAxis: {}, series: [{ type: 'bar', data: d.protein_rank.map(x => x.value) }] });
}

switchMenu('users');
