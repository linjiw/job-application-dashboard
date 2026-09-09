'use strict';
const $ = s => document.querySelector(s);
const labels={discovered:'Discovered',reviewed:'Reviewed',shortlisted:'Shortlisted',draft:'Draft',ready:'Ready',applying:'Unconfirmed',needs_input:'Needs input',submitted:'Submitted',interview:'Interview',offer:'Offer',rejected:'Rejected',withdrawn:'Withdrawn',expired:'Expired',skipped:'Skipped',archived:'Archived'};
const colors=['#2459f5','#7198ff','#27a794','#9173dc','#e9a64c'];
const state={data:null,query:'',category:'',status:'',quick:'all',day:'',sort:'recent',view:'list',page:1};
const pageSize=15;
const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dayKey = d => new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const fmt = (d, options={month:'short',day:'numeric',year:'numeric'}) => d ? new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',...options}).format(new Date(d)) : 'Not submitted';
const todayKey=()=>dayKey(new Date());
const badge = status => `<span class="status-badge status-${esc(status)}">${esc(labels[status]||status)}</span>`;
const colorFor = text => colors[[...text].reduce((a,c)=>a+c.charCodeAt(0),0)%colors.length];
const initials = text => text.split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase();
let focusedBeforeDialog;
function summaries(){
 const rows=state.data.applications, submitted=rows.filter(r=>r.submittedAt), today=submitted.filter(r=>r.submittedDay===todayKey());
 $('#total').textContent=submitted.length; $('#companies').textContent=`Across ${new Set(submitted.map(r=>r.company.toLowerCase())).size} companies`;
 $('#interviews').textContent=rows.filter(r=>['interview','offer'].includes(r.status)).length;
 $('#attention').textContent=rows.filter(r=>['needs_input','applying'].includes(r.status)).length;
 $('#today').textContent=today.length; const goal=state.data.dailyGoal;
 $('#goal-ring').style.setProperty('--progress',`${Math.min(100,today.length/goal*100)}%`);
 $('#goal-percent').textContent=`${Math.round(today.length/goal*100)}%`;
 $('#goal-caption').textContent=today.length>=goal?'Goal complete. Nicely done.':`${Math.max(0,goal-today.length)} more to today’s goal`;
 $('#nav-count').textContent=rows.length;
 $('#current-date').textContent=fmt(new Date(),{weekday:'short',month:'short',day:'numeric',year:'numeric'});
 const days=Array.from({length:14},(_,i)=>{let date=new Date(`${todayKey()}T12:00:00-04:00`);date.setUTCDate(date.getUTCDate()-13+i);const key=dayKey(date);return {key,date,count:submitted.filter(r=>r.submittedDay===key).length}});
 const max=Math.max(1,...days.map(d=>d.count));
 $('#chart').innerHTML=days.map((d,i)=>`<button class="chart-day" data-day="${d.key}" aria-label="${fmt(d.date)}: ${d.count} submissions. Filter applications." title="${fmt(d.date)} · ${d.count} submissions"><span class="number">${d.count||''}</span><span class="bar" style="height:${Math.max(2,d.count/max*108)}px;animation-delay:${i*25}ms"></span><span class="day">${fmt(d.date,{day:'numeric'})}</span></button>`).join('');
 $('#chart-total').textContent=`${days.reduce((a,d)=>a+d.count,0)} submissions in 14 days`;
 const categories=[...new Set(rows.map(r=>r.category))].sort();
 const catValues=categories.map(c=>({name:c,count:submitted.filter(r=>r.category===c).length})).sort((a,b)=>b.count-a.count);
 $('#categories').innerHTML=catValues.map((c,i)=>`<button class="category-row" data-category="${esc(c.name)}" aria-label="Filter ${esc(c.name)}"><span class="category-meta"><span>${esc(c.name)}</span><span>${c.count} <span aria-hidden="true">·</span> ${submitted.length?Math.round(c.count/submitted.length*100):0}%</span></span><span class="category-track"><i style="--color:${colors[i]};width:${submitted.length?c.count/submitted.length*100:0}%"></i></span></button>`).join('');
 $('#category').innerHTML='<option value="">All disciplines</option>'+categories.map(c=>`<option>${esc(c)}</option>`).join('');$('#category').value=state.category;
 $('#status').innerHTML='<option value="">All statuses</option>'+Object.keys(labels).filter(s=>rows.some(r=>r.status===s)).map(s=>`<option value="${s}">${labels[s]}</option>`).join('');$('#status').value=state.status;
 $('#sync').textContent=`Updated ${fmt(state.data.updatedAt,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}`;
}
function filtered(){
 return state.data.applications.filter(r=>{
  if(state.query&&!`${r.company} ${r.title} ${r.location}`.toLowerCase().includes(state.query.toLowerCase()))return false;
  if(state.category&&r.category!==state.category)return false;
  if(state.status&&r.status!==state.status)return false;
  if(state.day&&r.submittedDay!==state.day)return false;
  if(state.quick==='submitted'&&!r.submittedAt)return false;
  if(state.quick==='attention'&&!['applying','needs_input'].includes(r.status))return false;
  if(state.quick==='today'&&r.submittedDay!==todayKey())return false;
  return true;
 }).sort((a,b)=>state.sort==='company'?a.company.localeCompare(b.company)||a.title.localeCompare(b.title):String(state.sort==='submitted'?b.submittedAt||'':b.updatedAt).localeCompare(String(state.sort==='submitted'?a.submittedAt||'':a.updatedAt))||b.id-a.id);
}
function render(){
 if(!state.data)return;
 const all=filtered();const pages=Math.max(1,Math.ceil(all.length/pageSize));state.page=Math.min(state.page,pages);const rows=all.slice((state.page-1)*pageSize,state.page*pageSize);
 $('#result-total').textContent=state.data.applications.length;$('#showing').textContent=`${all.length} results${state.day?' · '+state.day:''}`;
 $('#page-info').textContent=all.length?`${(state.page-1)*pageSize+1}–${Math.min(state.page*pageSize,all.length)} of ${all.length} roles`:'0 roles';$('#prev').disabled=state.page===1;$('#next').disabled=state.page===pages;
 document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===state.quick)));
 $('#list-view').setAttribute('aria-pressed',String(state.view==='list'));$('#timeline-view').setAttribute('aria-pressed',String(state.view==='timeline'));
 if(!all.length){$('#results').innerHTML='<div class="empty"><strong>No matching applications.</strong><p>Try another search or reset the filters.</p></div>';return;}
 if(state.view==='timeline'){
  const groups={};rows.forEach(r=>{const key=dayKey(new Date(r.submittedAt||r.updatedAt));(groups[key]??=[]).push(r)});
  $('#results').innerHTML='<div class="timeline">'+Object.entries(groups).map(([day,items])=>`<section class="timeline-group"><h3>${fmt(day+'T12:00:00-04:00')} <span class="count-pill">${items.length}</span></h3>${items.map(r=>`<article class="timeline-item"><div><button data-detail="${r.id}"><strong>${esc(r.company)} <span aria-hidden="true">↗</span></strong><p>${esc(r.title)}</p></button><time>${r.submittedAt?'Submitted':'Last activity'} · ${fmt(r.submittedAt||r.updatedAt,{hour:'numeric',minute:'2-digit'})}</time></div>${badge(r.status)}</article>`).join('')}</section>`).join('')+'</div>';
 }else{
  $('#results').innerHTML=`<div class="table-wrap"><table><thead><tr><th scope="col">Company</th><th scope="col">Role / location</th><th scope="col">Discipline</th><th scope="col">Status</th><th scope="col">Submitted</th><th scope="col"><span class="sr-only">Details</span></th></tr></thead><tbody>${rows.map(r=>`<tr><td><div class="company-cell"><span class="company-logo" style="--color:${colorFor(r.company)}">${esc(initials(r.company))}</span><strong>${esc(r.company)}</strong></div></td><td><button class="role-button" data-detail="${r.id}">${esc(r.title)}</button><span class="role-location">${esc(r.location)}</span></td><td><span class="category-tag">${esc(r.category)}</span></td><td>${badge(r.status)}</td><td class="date-cell">${r.submittedAt?fmt(r.submittedAt,{month:'short',day:'numeric',year:'numeric'}):'—'}</td><td><button class="detail-link" data-detail="${r.id}" aria-label="View ${esc(r.company)} ${esc(r.title)} details">↗</button></td></tr>`).join('')}</tbody></table></div>`;
 }
}
function detail(id){
 const r=state.data.applications.find(r=>r.id===Number(id));if(!r)return;
 focusedBeforeDialog=document.activeElement;
 $('#detail-body').innerHTML=`<span class="company-logo" style="--color:${colorFor(r.company)}">${esc(initials(r.company))}</span><div class="detail-company">${esc(r.company)}</div><h2>${esc(r.title)}</h2>${badge(r.status)}<div class="detail-meta"><span>${esc(r.category)}</span><span>·</span><span>${esc(r.location)}</span></div>${r.url?`<a class="job-url" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">View original posting ↗</a>`:''}<section class="history"><h3>Application timeline</h3><div class="history-row"><span>Added to tracker</span><time>${fmt(r.addedAt)}</time></div>${r.history.map(e=>`<div class="history-row"><span>${esc(labels[e.status]||e.status)}</span><time>${fmt(e.at,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})}</time></div>`).join('')}${!r.history.length?'<p>No status changes recorded yet.</p>':''}</section><p class="role-location">Tracker #${r.id} · Last activity ${fmt(r.updatedAt)}</p>`;
 $('#detail').showModal();
}
function change(){state.page=1;render()}
$('#search').addEventListener('input',e=>{state.query=e.target.value;change()});
$('#category').addEventListener('change',e=>{state.category=e.target.value;change()});
$('#status').addEventListener('change',e=>{state.status=e.target.value;change()});
$('#sort').addEventListener('change',e=>{state.sort=e.target.value;change()});
$('#clear').addEventListener('click',()=>{Object.assign(state,{query:'',category:'',status:'',day:'',quick:'all',sort:'recent'});$('#search').value='';$('#category').value='';$('#status').value='';$('#sort').value='recent';change()});
$('#prev').addEventListener('click',()=>{state.page--;render()});$('#next').addEventListener('click',()=>{state.page++;render()});
$('#list-view').addEventListener('click',()=>{state.view='list';render()});$('#timeline-view').addEventListener('click',()=>{state.view='timeline';state.sort='submitted';$('#sort').value='submitted';change()});
document.addEventListener('click',e=>{let b=e.target.closest('[data-filter]');if(b){state.quick=b.dataset.filter;state.day='';state.status='';$('#status').value='';change()}b=e.target.closest('[data-detail]');if(b)detail(b.dataset.detail);b=e.target.closest('[data-category]');if(b){state.category=b.dataset.category;$('#category').value=state.category;change();$('#applications').scrollIntoView({behavior:'smooth'})}b=e.target.closest('[data-day]');if(b){state.day=b.dataset.day;state.quick='all';change();$('#applications').scrollIntoView({behavior:'smooth'})}});
$('#detail .close').addEventListener('click',()=>$('#detail').close());$('#detail').addEventListener('click',e=>{if(e.target===$('#detail')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});$('#detail').addEventListener('close',()=>focusedBeforeDialog?.focus());
let fetching=false;
async function load(){
 if(fetching)return;fetching=true;$('#refresh').disabled=true;
 try{const response=await fetch(`applications.json?t=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw Error('Data unavailable');const data=await response.json();if(data.version!==1||!Array.isArray(data.applications))throw Error('Invalid data');const changed=!state.data||data.updatedAt!==state.data.updatedAt;state.data=data;if(changed){summaries();render()}$('#error').hidden=true;}
 catch(error){$('#error').textContent=state.data?'Could not refresh. Showing the last loaded snapshot. Try Refresh again.':'The application tracker could not load. Please try Refresh again.';$('#error').hidden=false;$('#sync').textContent='Refresh needed';}
 finally{fetching=false;$('#refresh').disabled=false}
}
$('#refresh').addEventListener('click',load);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});setInterval(()=>{if(!document.hidden)load()},60000);load();
