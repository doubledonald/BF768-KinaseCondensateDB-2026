const token = localStorage.getItem('token');
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  };
}

function checkLogin() {
  if (!localStorage.getItem('token')) location.href = '/login';
}

function logout() {
  localStorage.clear();
  location.href = '/login';
}

function ensureToastRoot() {
  let root = document.getElementById('toastRoot');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toastRoot';
    root.className = 'toast-wrap';
    document.body.appendChild(root);
  }
  return root;
}

function showToast(message, type = 'info', timeout = 3000) {
  const root = ensureToastRoot();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerText = message;
  root.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-10px)';
    setTimeout(() => el.remove(), 220);
  }, Math.max(1800, timeout));
}

async function api(url, opt = {}) {
  opt.headers = Object.assign(authHeaders(), opt.headers || {});
  const r = await fetch(url, opt);
  let j;
  try {
    j = await r.json();
  } catch (e) {
    throw new Error('Invalid server response');
  }
  if (j.code === 401) {
    showToast('Login expired, please sign in again.', 'warn', 2600);
    logout();
  }
  if (j.code === 403) {
    throw new Error('Permission denied');
  }
  if (j.code !== 200) {
    throw new Error(j.msg || 'Request failed');
  }
  return j.data;
}

function showModal(title, html) {
  const titleEl = document.getElementById('modalTitle');
  const bodyEl = document.getElementById('modalBody');
  if (!titleEl || !bodyEl) return;
  titleEl.innerText = title;
  bodyEl.innerHTML = html;
  document.getElementById('modalMask').style.display = 'flex';
}

function closeModal() {
  const modal = document.getElementById('modalMask');
  if (modal) modal.style.display = 'none';
}

function esc(v) {
  return (v ?? '').toString().replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;'
  }[m]));
}

function yes(v) { return v == 1 ? 'Yes' : 'No'; }

function statusTag(v, className) {
  return `<span class="status-tag ${className}">${esc(v)}</span>`;
}

function formatVal(k, v) {
  if (['has_dna', 'has_rna', 'has_cmods', 'has_condensatopathy', 'reviewed_flag'].includes(k)) return yes(v);
  if (k === 'status') return statusTag(v == 1 ? 'Active' : 'Disabled', v == 1 ? 'ok' : 'warn');
  if (k === 'role') return statusTag(v === 'admin' ? 'Administrator' : 'User', 'muted');
  return v == null ? '' : v;
}

function uniprotUrl(acc) { return `https://www.uniprot.org/uniprotkb/${encodeURIComponent(acc)}`; }
function pubmedUrl(pmid) { return `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(pmid)}/`; }

function renderPmidLinks(value) {
  if (!value) return '';
  return String(value).split('|').map(x => x.trim()).filter(Boolean).map(x => `<a href="${pubmedUrl(x)}" target="_blank" rel="noopener">${esc(x)}</a>`).join(' | ');
}

function renderCell(k, v) {
  const fv = formatVal(k, v);
  if (k === 'uniprot_accession' && fv) return `<a href="${uniprotUrl(fv)}" target="_blank" rel="noopener">${esc(fv)}</a>`;
  if ((k === 'pmid' || k === 'pmids') && fv) return renderPmidLinks(fv);
  return esc(fv);
}

function encodeRecord(row) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(row || {}))));
  } catch (e) {
    return '';
  }
}

function decodeRecord(value) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(value))));
  } catch (e) {
    return {};
  }
}

function tableHtml(cols, rows, actions) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) {
    return '<div class="empty-state">No records found.</div>';
  }
  const extra = actions ? `<th>Actions</th>` : '';
  const heads = cols.map(c => `<th>${esc(c[1])}</th>`).join('');
  const body = list.map(r => {
    const recordAttr = encodeRecord(r);
    const cells = cols.map(c => `<td>${renderCell(c[0], r[c[0]])}</td>`).join('');
    const actionHtml = actions ? `<td class="actions">${actions(r)}</td>` : '';
    return `<tr data-row="${recordAttr}">${cells}${actionHtml}</tr>`;
  }).join('');
  return `<div class="table-wrap"><table><thead><tr>${heads}${extra}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function pagerHtml(state) {
  const totalPages = Math.max(Math.ceil((state.total || 0) / state.size), 1);
  return `<div class="pagination"><button class="btn small" ${state.page <= 1 ? 'disabled' : ''} onclick="loadList(${state.page - 1})">Previous</button><span>Page ${state.page} / ${totalPages}, Total ${state.total || 0}</span><button class="btn small" ${state.page >= totalPages ? 'disabled' : ''} onclick="loadList(${state.page + 1})">Next</button></div>`;
}

function getRowFromButton(btn) {
  const tr = btn && btn.closest('tr[data-row]');
  if (!tr) return {};
  return decodeRecord(tr.dataset.row || '');
}

function copyText(text) {
  const str = typeof text === 'string' ? text : JSON.stringify(text || {}, null, 2);
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    showToast('Copy not supported in this browser.', 'warn');
    return false;
  }
  navigator.clipboard.writeText(str).then(() => {
    showToast('Copied to clipboard', 'success');
  }).catch(() => {
    showToast('Failed to copy', 'error');
  });
}

function copyRow(btn) {
  const row = getRowFromButton(btn);
  const label = row.uniprot_accession || row.gene_name || row.condensate_uid || row.disease_name || row.cmod_name || row.pmid || row.user_id || '';
  const value = `${label}\n${JSON.stringify(row, null, 2)}`;
  copyText(value);
}

function expandRow(btn, title = 'Record Detail') {
  const row = getRowFromButton(btn);
  const list = Object.entries(row)
    .filter(([k, v]) => v !== null && v !== undefined && String(v) !== '')
    .map(([k, v]) => `<div class="detail-row"><b>${esc(k)}</b><br>${renderCell(k, v)}</div>`)
    .join('');
  showModal(title, `<pre class="record-json">${esc(JSON.stringify(row, null, 2))}</pre>${list || '<p>No detail data.</p>'}`);
}

function statePanel(container, type, message) {
  if (!container) return;
  const map = {
    loading: 'loading-state',
    error: 'error-state',
    empty: 'empty-state'
  };
  container.className = `${map[type] || 'loading-state'}`;
  container.innerHTML = message || '';
}

async function exportUrl(name) {
  const kw = encodeURIComponent(document.getElementById('kw')?.value || '');
  const r = await fetch(`/api/${name}/export?keyword=${kw}&type=excel`, {
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
  });
  if (r.status === 401) {
    showToast('Login expired', 'warn');
    logout();
    return;
  }
  if (!r.ok) {
    showToast('Export failed', 'error');
    return;
  }
  const blob = await r.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
