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

const fieldLabels = {
  username: 'Username',
  password: 'Password',
  gender: 'Gender',
  phone: 'Phone',
  email: 'Email',
  protein_id: 'Protein',
  entry_name: 'Entry Name',
  organism_name: 'Organism',
  sequence_length: 'Sequence Length',
  sequence: 'Sequence',
  reviewed_flag: 'Reviewed',
  has_dna: 'Has DNA',
  has_rna: 'Has RNA',
  has_cmods: 'Has C-modifier',
  has_condensatopathy: 'Has Disease Evidence',
  condensate_type: 'Condensate Type',
  species_tax_id: 'Species Taxonomy ID',
  proteins_count: 'Protein Count',
  confidence_score: 'Confidence Score',
  cmod_name: 'C-mod Name',
  biomolecular_type: 'Biomolecular Type',
  phenotypic_class: 'Phenotypic Class',
  pmid: 'PubMed PMID'
};

const requiredFields = {
  users: ['username', 'password'],
  proteins: ['uniprot_accession', 'gene_name', 'protein_name', 'species_name'],
  kinases: ['protein_id', 'entry_name', 'sequence', 'sequence_length'],
  condensates: ['condensate_uid', 'condensate_name', 'condensate_type', 'species_tax_id'],
  diseases: ['disease_name'],
  cmods: ['cmod_name'],
  publications: ['pmid']
};

const formSections = {
  users: [
    { title: 'Basic Identity', fields: ['username', 'password', 'gender', 'phone', 'email'] }
  ],
  proteins: [
    { title: 'Protein Information', fields: ['uniprot_accession', 'gene_name', 'protein_name', 'species_name', 'biomolecular_condensate_count', 'synthetic_condensate_count'] }
  ],
  kinases: [
    { title: 'Protein/Entry Metadata', fields: ['protein_id', 'entry_name', 'organism_name', 'sequence_length', 'sequence', 'reviewed_flag'] }
  ],
  condensates: [
    { title: 'Condensate Core', fields: ['condensate_uid', 'condensate_name', 'condensate_type', 'species_tax_id', 'confidence_score', 'proteins_count'] },
    { title: 'Evidence Flags', fields: ['has_dna', 'has_rna', 'has_cmods', 'has_condensatopathy'] }
  ],
  diseases: [
    { title: 'Disease Record', fields: ['disease_name'] }
  ],
  cmods: [
    { title: 'Modifier Record', fields: ['cmod_name', 'biomolecular_type', 'phenotypic_class'] }
  ],
  publications: [
    { title: 'Publication', fields: ['pmid'] }
  ],
  'admin-logs': [
    { title: 'Read-only', fields: [] }
  ]
};

function fieldRequiredMark(field, isEdit) {
  if (field !== 'password') return requiredFields[current]?.includes(field) && (!isEdit || current !== 'users') ? '<span class="required-mark">*</span>' : '';
  if (current !== 'users') return '';
  if (isEdit) return '';
  return requiredFields[current]?.includes(field) ? '<span class="required-mark">*</span>' : '';
}

function clearFieldErrors() {
  document.querySelectorAll('.input.error').forEach(i => i.classList.remove('error'));
}

function setFormMessage(msg, type = 'error') {
  const el = document.getElementById('formMsg');
  if (!el) return;
  el.innerHTML = msg ? `<div class="${type}">${msg}</div>` : '';
  if (msg) showToast(msg, type === 'error' ? 'error' : 'success');
}

function getSections() {
  return formSections[current] || [{ title: 'Record', fields: config[current]?.fields || [] }];
}

function renderFieldInput(f, value, isEdit = false) {
  const label = `${fieldLabels[f] || f}`;
  const isRequired = requiredFields[current]?.includes(f);
  if (f === 'sequence') {
    return `<div class="form-row"><label>${label}${isRequired ? fieldRequiredMark(f, isEdit) : ''}</label><textarea id="f_${f}" class="input" rows="4">${esc(value)}</textarea></div>`;
  }
  if (f === 'status' || f.startsWith('has_') || f === 'reviewed_flag') {
    return `<div class="form-row"><label>${label}${isRequired ? fieldRequiredMark(f, isEdit) : ''}</label><select id="f_${f}" class="input">${['1', '0'].map(v => `<option value="${v}" ${String(value) === String(v) ? 'selected' : ''}>${v == 1 ? 'Yes' : 'No'}</option>`).join('')}</select></div>`;
  }
  return `<div class="form-row"><label>${label}${isRequired ? fieldRequiredMark(f, isEdit) : ''}</label><input id="f_${f}" class="input" value="${esc(value)}"></input></div>`;
}

function showStatePanel(type, message) {
  const container = document.getElementById('list');
  if (!container) return;
  container.innerHTML = `<div class="${type === 'error' ? 'error-state' : 'empty-state'}">${message}</div>`;
}

function renderManage() {
  const c = config[current];
  const isLog = current === 'admin-logs';
  const extraFilters = isLog
    ? `<select id="actionType" class="input"><option value="">All Actions</option><option value="CREATE">CREATE</option><option value="UPDATE">UPDATE</option><option value="DELETE">DELETE</option></select><input id="targetTable" class="input" placeholder="Target table">`
    : '';
  const addBtn = isLog
    ? ''
    : `<button class="btn primary" onclick="openForm()">Add</button><button class="btn" onclick="exportUrl('${current}')">Export Excel</button>`;
  const subtitle = isLog
    ? 'Only read mode: records are filtered by action type and target table.'
    : 'Use this panel to manage entries; edit, delete, and maintain relationships where supported.';

  document.getElementById('main').innerHTML = `
    <div class="card">
      <h2>${c.title}</h2>
      <p class="muted">${subtitle}</p>
      <div class="toolbar">
        <input id="kw" class="input" placeholder="Keyword search">
        ${extraFilters}
        <button class="btn primary" onclick="loadList(1)">Search</button>
        ${addBtn}
      </div>
      <div id="list"></div>
    </div>`;
  loadList(1);
}

function switchMenu(n) {
  current = n;
  document.querySelectorAll('.side-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('side-' + n)?.classList.add('active');
  state.page = 1;
  renderManage();
}

function actionsForCurrent(r) {
  if (current === 'admin-logs') return '';
  const c = config[current];
  let s = `<button class="btn small" onclick="openFormFromRow(this)">Edit</button> <button class="btn danger small" onclick="delRow('${r[c.pk]}')">Delete</button> <button class="btn warn small" onclick="copyRow(this)">Copy</button> <button class="btn small" onclick="expandRow(this, '${c.title} Record')">Expand</button>`;
  if (current === 'users') s += ` <button class="btn small" onclick="toggleUser('${r.user_id}',${r.status})">${r.status == 1 ? 'Disable' : 'Enable'}</button>`;
  if (current === 'proteins') s += ` <button class="btn small" onclick="managePC(${r.protein_id})">Condensates</button>`;
  if (current === 'condensates') s += ` <button class="btn small" onclick="manageCC(${r.condensate_id})">C-mods</button> <button class="btn small" onclick="manageCD(${r.condensate_id})">Diseases</button>`;
  return s;
}

async function loadList(p = 1) {
  state.page = p;
  const kw = document.getElementById('kw')?.value || '';
  const list = document.getElementById('list');
  const c = config[current];
  if (!list || !c) return;

  list.innerHTML = '<div class="loading-state">Loading data...</div>';
  let url = `/api/${current}?page=${p}&size=${Math.min(state.size, 100)}&keyword=${encodeURIComponent(kw)}`;
  if (current === 'admin-logs') {
    url += `&action_type=${encodeURIComponent(document.getElementById('actionType')?.value || '')}&target_table=${encodeURIComponent(document.getElementById('targetTable')?.value || '')}`;
  }

  try {
    const data = await api(url);
    state.total = data.total || 0;
    const items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) {
      list.innerHTML = '<div class="empty-state">No records found.</div>';
      return;
    }
    list.innerHTML = tableHtml(c.cols, items, r => actionsForCurrent(r)) + pagerHtml(state);
  } catch (e) {
    showStatePanel('error', e.message || 'Request failed');
  }
}

function openFormFromRow(btn) {
  const row = getRowFromButton(btn);
  openForm(row);
}

function openForm(row = null) {
  if (current === 'admin-logs') return;
  const c = config[current];
  const isEdit = !!row;

  let html = '<div id="formMsg"></div>';
  html += getSections().map(section => {
    const rows = section.fields.filter(f => c.fields.includes(f)).map(f => {
      const v = row?.[f] ?? '';
      return renderFieldInput(f, v, isEdit);
    }).join('');
    return `<h3>${section.title}</h3>${rows || ''}`;
  }).join('');

  html += `<div class="toolbar"><button class="btn primary" onclick="saveForm('${isEdit ? row?.[c.pk] || '' : ''}')">Save</button><button class="btn" onclick="closeModal()">Cancel</button></div>`;
  showModal(isEdit ? 'Edit Record' : 'Add Record', `<div class="card" style="margin-bottom: 0;">${html}</div>`);
  clearFieldErrors();
  setFormMessage('', '');
}

function collectFormData() {
  const c = config[current];
  const title = document.getElementById('modalTitle')?.innerText || '';
  const isEdit = title.includes('Edit');
  const data = {};
  let valid = true;
  clearFieldErrors();

  c.fields.forEach(f => {
    const el = document.getElementById('f_' + f);
    if (!el) return;

    const value = (el.value ?? '').toString().trim();
    if (isEdit && current === 'users' && f === 'password' && !value) {
      return;
    }
    if (!value && requiredFields[current]?.includes(f)) {
      el.classList.add('error');
      showToast(`Missing required field: ${fieldLabels[f] || f}`, 'warn');
      valid = false;
      return;
    }
    data[f] = value;
  });

  if (!valid) {
    setFormMessage('Please fill required fields.');
    return null;
  }
  return data;
}

async function saveForm(id = '') {
  const c = config[current];
  const data = collectFormData();
  if (!data) return;

  if (current === 'users') {
    data.role = 'user';
    if (!id) data.status = 1;
  }

  try {
    await api(`/api/${current}${id ? '/' + id : ''}`, {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(data)
    });
    showToast(id ? 'Record updated.' : 'Record created.', 'success');
    closeModal();
    loadList(state.page);
  } catch (e) {
    setFormMessage(e.message || 'Save failed.', 'error');
  }
}

async function delRow(id) {
  if (!confirm('Delete this record? This action cannot be undone.')) return;
  try {
    await api(`/api/${current}/${id}`, { method: 'DELETE' });
    showToast('Deleted successfully.', 'success');
    loadList(state.page);
  } catch (e) {
    showToast(e.message || 'Delete failed', 'error');
  }
}

async function toggleUser(id, status) {
  if (!confirm(status == 1 ? 'Disable this user account now?' : 'Enable this user account now?')) return;
  try {
    await api(`/api/users/${id}/toggle`, { method: 'PUT' });
    loadList(state.page);
  } catch (e) {
    showToast(e.message || 'Toggle failed', 'error');
  }
}

async function selectOptions(name, selected) {
  const rows = await api(`/api/options/${name}`);
  return rows
    .map(o => `<option value="${esc(o.value)}" ${String(o.value) === String(selected) ? 'selected' : ''}>${esc(o.label)} (${esc(o.value)})</option>`)
    .join('');
}

async function managePC(pid) {
  if (!pid) return;
  try {
    const rows = await api(`/api/proteins/${pid}/condensates`);
    showModal('Maintain Protein-Condensate Relations', `
      <div class="toolbar"><input id="rel_cid" class="input" placeholder="Condensate ID"><button class="btn primary" onclick="addPC(${pid})">Add Relation</button></div>
      ${tableHtml([['protein_condensate_id', 'Relation ID'], ['condensate_id', 'Condensate ID'], ['condensate_uid', 'UID'], ['condensate_name', 'Name'], ['evidence_source', 'Evidence Source']], rows, r => `<button class="btn danger small" onclick="delRel('/api/relations/protein-condensate/${r.protein_condensate_id}',()=>managePC(${pid}),'relation')">Delete</button>`)}
    `);
  } catch (e) {
    showToast(e.message || 'Load relation failed', 'error');
  }
}

async function addPC(pid) {
  const condensateId = document.getElementById('rel_cid')?.value?.trim();
  if (!condensateId) { showToast('Please input a condensate id.', 'warn'); return; }
  try {
    await api('/api/relations/protein-condensate', {
      method: 'POST',
      body: JSON.stringify({ protein_id: pid, condensate_id: condensateId, evidence_source: 'manual' })
    });
    showToast('Relation added.', 'success');
    managePC(pid);
  } catch (e) {
    showToast(e.message || 'Add relation failed', 'error');
  }
}

async function manageCC(cid) {
  if (!cid) return;
  try {
    const rows = await api(`/api/condensates/${cid}/cmods`);
    showModal('Maintain Condensate-Chemical Modifier Relations', `
      <div class="toolbar"><input id="rel_mid" class="input" placeholder="C-mod ID"><input id="rel_pmid" class="input" placeholder="PMID"><button class="btn primary" onclick="addCC(${cid})">Add Relation</button></div>
      ${tableHtml([['condensate_cmod_id', 'Relation ID'], ['cmod_id', 'C-mod ID'], ['cmod_name', 'Chemical Modifier'], ['biomolecular_type', 'Biomolecular Type'], ['phenotypic_class', 'Phenotypic Class'], ['pmid', 'PMID']], rows, r => `<button class="btn danger small" onclick="delRel('/api/relations/condensate-cmod/${r.condensate_cmod_id}',()=>manageCC(${cid}),'relation')">Delete</button>`)}
    `);
  } catch (e) {
    showToast(e.message || 'Load relation failed', 'error');
  }
}

async function addCC(cid) {
  const cmodId = document.getElementById('rel_mid')?.value?.trim();
  const pmid = document.getElementById('rel_pmid')?.value?.trim() || null;
  if (!cmodId) { showToast('Please input a C-mod id.', 'warn'); return; }
  try {
    await api('/api/relations/condensate-cmod', {
      method: 'POST',
      body: JSON.stringify({ condensate_id: cid, cmod_id: cmodId, pmid })
    });
    showToast('Relation added.', 'success');
    manageCC(cid);
  } catch (e) {
    showToast(e.message || 'Add relation failed', 'error');
  }
}

async function manageCD(cid) {
  if (!cid) return;
  try {
    const rows = await api(`/api/condensates/${cid}/diseases`);
    showModal('Maintain Condensate-Disease Relations', `
      <div class="toolbar"><input id="rel_did" class="input" placeholder="Disease ID"><input id="rel_pmid" class="input" placeholder="PMID"><textarea id="rel_dys" class="input" placeholder="Dysregulation description"></textarea><br><br><textarea id="rel_marker" class="input" placeholder="Condensate markers"></textarea><br><br><button class="btn primary" onclick="addCD(${cid})">Add Relation</button></div>
      <p class="muted">Dysregulation descriptions, condensate markers, and PMID evidence IDs are maintained here.</p>
      ${tableHtml([['condensate_disease_id', 'Relation ID'], ['disease_id', 'Disease ID'], ['disease_name', 'Disease Name'], ['dysregulation_type', 'Dysregulation Type'], ['condensate_markers', 'Markers'], ['pmid', 'PMID']], rows, r => `<button class="btn danger small" onclick="delRel('/api/relations/condensate-disease/${r.condensate_disease_id}',()=>manageCD(${cid}),'relation')">Delete</button>`)}
    `);
  } catch (e) {
    showToast(e.message || 'Load relation failed', 'error');
  }
}

async function addCD(cid) {
  const diseaseId = document.getElementById('rel_did')?.value?.trim();
  const pmid = document.getElementById('rel_pmid')?.value?.trim() || null;
  const dys = document.getElementById('rel_dys')?.value?.trim();
  const marker = document.getElementById('rel_marker')?.value?.trim();

  if (!diseaseId) { showToast('Please input a disease id.', 'warn'); return; }
  try {
    await api('/api/relations/condensate-disease', {
      method: 'POST',
      body: JSON.stringify({
        condensate_id: cid,
        disease_id: diseaseId,
        pmid: pmid,
        dysregulation_type: dys || '',
        condensate_markers: marker || ''
      })
    });
    showToast('Relation added.', 'success');
    manageCD(cid);
  } catch (e) {
    showToast(e.message || 'Add relation failed', 'error');
  }
}

async function delRel(url, cb, label = 'Record') {
  if (!confirm(`Delete this ${label}?`)) return;
  await api(url, { method: 'DELETE' });
  cb();
}

async function dashboard() {
  current = 'dashboard';
  document.querySelectorAll('.side-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('side-dashboard')?.classList.add('active');
  const mainEl = document.getElementById('main');
  mainEl.innerHTML = `
    <div class="card">
      <div class="toolbar" style="justify-content: space-between; width:100%;">
        <div>
          <h2>Statistics</h2>
          <p class="muted">Live summary from /api/stats endpoints.</p>
        </div>
        <div class="btn-group">
          <button class="btn primary" onclick="renderDashboardCharts()">Reload</button>
          <button class="btn" onclick="clearDashboardCharts()">Clear</button>
        </div>
      </div>
      <div id="statCards" class="grid"></div>
      <div class="charts">
        <div class="card chart" id="c1"></div>
        <div class="card chart" id="c2"></div>
      </div>
      <div class="charts">
        <div class="card chart" id="c3"></div>
        <div class="card chart" id="c4"></div>
      </div>
    </div>`;
  await renderDashboardCharts();
}

async function renderDashboardCharts() {
  try {
    const s = await api('/api/stats/summary');
    const cards = document.getElementById('statCards');
    if (!cards) return;
    cards.innerHTML = Object.entries({
      'Proteins': s.protein_total,
      'Kinases': s.kinase_total,
      'Condensates': s.condensate_total,
      'Diseases': s.disease_total,
      'Publications': s.publication_total,
      'Chemical Modifiers': s.cmod_total,
      'Total Users': s.user_total,
      'Standard Users': s.normal_user_total,
      'Administrators': s.admin_total,
      'Disabled Users': s.disabled_user_total
    }).map(([k, v]) => `<div class="stat"><span>${k}</span><br><b>${v}</b></div>`).join('');

    const d = await api('/api/stats/charts');
    echarts.init(c1).setOption({
      title: { text: 'Condensate Count by Type' },
      tooltip: {},
      series: [{ type: 'pie', data: d.condensate_type || [] }]
    });
    echarts.init(c2).setOption({
      title: { text: 'Top Proteins by Condensate Associations' },
      xAxis: { type: 'category', data: (d.protein_rank || []).map(x => x.name), axisLabel: { rotate: 30 } },
      yAxis: {},
      series: [{ type: 'bar', data: (d.protein_rank || []).map(x => x.value) }]
    });
    echarts.init(c3).setOption({
      title: { text: 'Condensate Count by Species' },
      xAxis: { type: 'category', data: (d.species_count || []).map(x => x.name), axisLabel: { rotate: 30 } },
      yAxis: {},
      series: [{ type: 'bar', data: (d.species_count || []).map(x => x.value) }]
    });
    echarts.init(c4).setOption({
      title: { text: 'Disease-Associated Condensate Count' },
      xAxis: { type: 'category', data: (d.disease_rank || []).map(x => x.name), axisLabel: { rotate: 30 } },
      yAxis: {},
      series: [{ type: 'bar', data: (d.disease_rank || []).map(x => x.value) }]
    });
  } catch (e) {
    const main = document.getElementById('main');
    if (main) {
      main.innerHTML = `<div class="card"><div class="error-state">Statistics load failed: ${esc(e.message || 'unknown error')}</div></div>`;
    }
  }
}

function clearDashboardCharts() {
  ['c1', 'c2', 'c3', 'c4'].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.innerHTML = '<div class="empty-state">Cleared</div>';
  });
}

switchMenu('users');
