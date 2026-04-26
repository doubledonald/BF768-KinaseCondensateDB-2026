const token = localStorage.getItem('token');
function authHeaders(){return {'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('token')}}
function checkLogin(){if(!localStorage.getItem('token')) location.href='/login'}
function logout(){localStorage.clear();location.href='/login'}
async function api(url,opt={}){opt.headers=Object.assign(authHeaders(),opt.headers||{});const r=await fetch(url,opt);let j;try{j=await r.json()}catch(e){throw new Error('Invalid server response')}if(j.code===401){alert('Login expired');logout()} if(j.code!==200) throw new Error(j.msg);return j.data}
function showModal(title, html){document.getElementById('modalTitle').innerText=title;document.getElementById('modalBody').innerHTML=html;document.getElementById('modalMask').style.display='flex'}
function closeModal(){document.getElementById('modalMask').style.display='none'}
function esc(v){return (v??'').toString().replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
function yes(v){return v==1?'Yes':'No'}
function formatVal(k,v){if(['has_dna','has_rna','has_cmods','has_condensatopathy','reviewed_flag'].includes(k))return yes(v); if(k==='status')return v==1?'Active':'Disabled'; if(k==='role')return v==='admin'?'Administrator':'User'; return v}
function uniprotUrl(acc){return `https://www.uniprot.org/uniprotkb/${encodeURIComponent(acc)}`}
function pubmedUrl(pmid){return `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(pmid)}/`}
function renderPmidLinks(value){if(!value)return '';return String(value).split('|').map(x=>x.trim()).filter(Boolean).map(x=>`<a href="${pubmedUrl(x)}" target="_blank" rel="noopener">${esc(x)}</a>`).join(' | ')}
function renderCell(k,v){const fv=formatVal(k,v);if(k==='uniprot_accession'&&fv)return `<a href="${uniprotUrl(fv)}" target="_blank" rel="noopener">${esc(fv)}</a>`;if((k==='pmid'||k==='pmids')&&fv)return renderPmidLinks(fv);return esc(fv)}
function tableHtml(cols, rows, actions){return `<table><thead><tr>${cols.map(c=>`<th>${c[1]}</th>`).join('')}${actions?'<th>Actions</th>':''}</tr></thead><tbody>${(rows||[]).map(r=>`<tr>${cols.map(c=>`<td>${renderCell(c[0],r[c[0]])}</td>`).join('')}${actions?`<td class="actions">${actions(r)}</td>`:''}</tr>`).join('')||`<tr><td colspan="${cols.length+(actions?1:0)}">No data</td></tr>`}</tbody></table>`}
function pagerHtml(state){return `<div class="pagination"><button class="btn small" ${state.page<=1?'disabled':''} onclick="loadList(${state.page-1})">Previous</button><span>Page ${state.page} / ${Math.ceil(state.total/state.size)||1}, Total ${state.total}</span><button class="btn small" ${state.page>=Math.ceil(state.total/state.size)?'disabled':''} onclick="loadList(${state.page+1})">Next</button></div>`}
async function exportUrl(name){const kw=encodeURIComponent(document.getElementById('kw')?.value||'');const r=await fetch(`/api/${name}/export?keyword=${kw}&type=excel`,{headers:{'Authorization':'Bearer '+localStorage.getItem('token')}});if(r.status===401){alert('Login expired');logout();return}if(!r.ok){alert('Export failed');return}const blob=await r.blob();const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${name}.xlsx`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(a.href)}
