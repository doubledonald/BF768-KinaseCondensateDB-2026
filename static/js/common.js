function getToken(){return (localStorage.getItem('token') || '').trim()}
function hasUsableToken(token){
  return typeof token === 'string' && token !== '' && token !== 'undefined' && token !== 'null' && token.split('.').length === 3;
}
function authHeaders(){
  const token = getToken();
  const headers = {'Content-Type':'application/json'};
  if (hasUsableToken(token)) headers.Authorization = `Bearer ${token}`;
  return headers;
}
function checkLogin(){
  const token = getToken();
  if(!hasUsableToken(token)){ localStorage.removeItem('token'); localStorage.removeItem('user'); location.href='login'; }
}
function logout(){localStorage.removeItem('token');localStorage.removeItem('user');location.href='login'}
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
function tableHtml(cols, rows, actions){return `<div class="table-wrap"><table><thead><tr>${cols.map(c=>`<th>${c[1]}</th>`).join('')}${actions?'<th>Actions</th>':''}</tr></thead><tbody>${(rows||[]).map(r=>`<tr>${cols.map(c=>`<td>${renderCell(c[0],r[c[0]])}</td>`).join('')}${actions?`<td class="actions">${actions(r)}</td>`:''}</tr>`).join('')||`<tr><td colspan="${cols.length+(actions?1:0)}">No data</td></tr>`}</tbody></table></div>`}
function pageCount(state){return Math.ceil((Number(state.total)||0)/(Number(state.size)||10))||1}
function jumpToPage(loaderName,inputId,maxPage){const el=document.getElementById(inputId);if(!el)return;let p=parseInt(el.value,10);if(!Number.isFinite(p)){alert('Please enter a page number');return}p=Math.max(1,Math.min(p,Number(maxPage)||1));const fn=window[loaderName];if(typeof fn==='function')fn(p)}
function pagerHtml(state,loaderName='loadList',inputId='pageJump'){const pages=pageCount(state);return `<div class="pagination"><div class="pager-nav"><button class="btn small" ${state.page<=1?'disabled':''} onclick="${loaderName}(${state.page-1})">Previous</button><span class="pager-info">Page ${state.page} / ${pages}, Total ${state.total}</span><button class="btn small" ${state.page>=pages?'disabled':''} onclick="${loaderName}(${state.page+1})">Next</button></div><label class="page-jump">Jump to <input id="${inputId}" class="page-jump-input" type="number" min="1" max="${pages}" placeholder="Page" onkeydown="if(event.key==='Enter') jumpToPage('${loaderName}','${inputId}',${pages})"><button class="btn small" onclick="jumpToPage('${loaderName}','${inputId}',${pages})">Go</button></label></div>`}
async function exportUrl(name){const kw=encodeURIComponent(document.getElementById('kw')?.value||'');const r=await fetch(`api/${name}/export?keyword=${kw}&type=excel`,{headers:{'Authorization':'Bearer '+localStorage.getItem('token')}});if(r.status===401){alert('Login expired');logout();return}if(!r.ok){alert('Export failed');return}const blob=await r.blob();const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${name}.xlsx`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(a.href)}
