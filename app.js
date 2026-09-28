const $=s=>document.querySelector(s), LS=localStorage;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9);
const cfg=()=>JSON.parse(LS.getItem('gh')||'null');
let data={categories:[],items:[]}, cat='all', sub='', q='', dirty=false, admin=LS.getItem('admin')==='1';

async function load(){
  try{ data=await (await fetch('data.json?'+Date.now(),{cache:'no-store'})).json(); }
  catch(e){ toast('No se pudo cargar data.json'); }
  const d=LS.getItem('draft'); if(admin&&d){ data=JSON.parse(d); dirty=true; }
  render();
}
function save(){ dirty=true; LS.setItem('draft',JSON.stringify(data)); render(); }
function toast(m){ const t=$('#toast'); t.textContent=m; t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),3500); }
function openDlg(h){ const d=$('#dlg'); d.innerHTML=h; if(!d.open) d.showModal(); }
const closeDlg=()=>$('#dlg').close();
const catOf=id=>data.categories.find(c=>c.id===id);

function render(){
  $('#adminbar').hidden=!admin; if(admin) renderAdmin();
  $('#cats').innerHTML=[{id:'all',name:'Todo',icon:'✨'},...data.categories].map(c=>`<button class="chip ${cat===c.id?'on':''}" data-c="${c.id}">${esc(c.icon)} ${esc(c.name)}</button>`).join('');
  const c=catOf(cat);
  $('#subs').innerHTML=c?.subs?.length?[{id:'',name:'Todas'},...c.subs].map(s=>`<button class="chip sm ${sub===s.id?'on':''}" data-s="${s.id}">${esc(s.name)}</button>`).join(''):'';
  const list=data.items.filter(i=>(cat==='all'||i.cat===cat)&&(!sub||i.sub===sub)&&`${i.title} ${i.desc}`.toLowerCase().includes(q));
  $('#list').innerHTML=list.length?list.map(card).join(''):`<p class="empty">${admin?'No hay recursos aquí. Usa “Agregar recurso”.':'Aún no hay recursos en esta sección.'}</p>`;
}
function card(i){
  const c=catOf(i.cat), s=c?.subs?.find(x=>x.id===i.sub), ok=/^https?:\/\//i.test(i.url);
  return `<article class="item"><div><h2>${esc(i.title)}</h2>${i.desc?`<p>${esc(i.desc)}</p>`:''}<div class="meta">${esc(c?.icon)} ${esc(c?.name||'Sin categoría')}${s?' / '+esc(s.name):''}</div></div>
  ${ok?`<a class="go" href="${esc(i.url)}" target="_blank" rel="noopener noreferrer">Descargar</a>`:''}
  ${admin?`<div class="tools"><button data-act="editItem" data-a="${i.id}">Editar</button><button class="danger" data-act="delItem" data-a="${i.id}">Eliminar</button></div>`:''}</article>`;
}
function renderAdmin(){
  $('#adminbar').innerHTML=`<button class="pri" data-act="newItem">+ Agregar recurso</button><button data-act="catMgr">Categorías</button>
  <button data-act="publish">${dirty?'● ':''}Publicar en GitHub</button><button data-act="settings">Ajustes GitHub</button>
  <button data-act="export">Exportar</button><button data-act="import">Importar</button><button data-act="logout">Salir</button>`;
}

function itemForm(id){
  if(!data.categories.length) return toast('Primero crea una categoría');
  const it=data.items.find(i=>i.id===id)||{cat:catOf(cat)?cat:data.categories[0].id,sub:sub};
  openDlg(`<form id="f"><h2>${id?'Editar':'Nuevo'} recurso</h2>
  <label>Título<input name="title" required value="${esc(it.title)}"></label>
  <label>Descripción<textarea name="desc" rows="3">${esc(it.desc)}</textarea></label>
  <label>Enlace de descarga<input name="url" type="url" required placeholder="https://…" value="${esc(it.url)}"></label>
  <label>Categoría<select name="cat">${data.categories.map(c=>`<option value="${c.id}" ${c.id===it.cat?'selected':''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('')}</select></label>
  <label>Subcategoría<select name="sub"></select></label>
  <div class="row"><button type="button" data-close>Cancelar</button><button class="pri">Guardar</button></div></form>`);
  const f=$('#f'), fillSubs=()=>{ f.sub.innerHTML='<option value="">Ninguna</option>'+(catOf(f.cat.value)?.subs||[]).map(s=>`<option value="${s.id}" ${s.id===it.sub?'selected':''}>${esc(s.name)}</option>`).join(''); };
  fillSubs(); f.cat.onchange=()=>{ it.sub=''; fillSubs(); };
  f.onsubmit=e=>{ e.preventDefault();
    const v={title:f.title.value.trim(),desc:f.desc.value.trim(),url:f.url.value.trim(),cat:f.cat.value,sub:f.sub.value};
    if(id) Object.assign(data.items.find(i=>i.id===id),v); else data.items.unshift({id:uid(),...v,date:new Date().toISOString().slice(0,10)});
    save(); closeDlg(); toast('Guardado (falta publicar)'); };
}
function catMgr(){
  openDlg(`<h2>Categorías</h2>`+(data.categories.map(c=>`<div class="cm"><div><b>${esc(c.icon)} ${esc(c.name)}</b><span>
  <button class="mini" data-act="renCat" data-a="${c.id}">Renombrar</button> <button class="mini" data-act="iconCat" data-a="${c.id}">Ícono</button> <button class="mini" data-act="addSub" data-a="${c.id}">+ Sub</button> <button class="mini danger" data-act="delCat" data-a="${c.id}">Eliminar</button></span></div>
  <div class="subs">${(c.subs||[]).map(s=>`<span class="tag">${esc(s.name)} <button class="mini" data-act="renSub" data-a="${c.id}" data-b="${s.id}">✎</button><button class="mini danger" data-act="delSub" data-a="${c.id}" data-b="${s.id}">✕</button></span>`).join('')}</div></div>`).join('')||'<p class="hint">Aún no hay categorías.</p>')+
  `<div class="row"><button data-act="addCat">+ Nueva categoría</button><button class="pri" data-close>Listo</button></div>`);
}
function settings(){
  const c=cfg()||{branch:'main',path:'data.json'};
  openDlg(`<form id="f"><h2>Ajustes de GitHub</h2><p class="hint">Permiten publicar los cambios directo desde la app. El token se guarda solo en este dispositivo.</p>
  <label>Usuario o organización<input name="owner" required value="${esc(c.owner)}"></label>
  <label>Repositorio<input name="repo" required value="${esc(c.repo)}"></label>
  <label>Rama<input name="branch" required value="${esc(c.branch)}"></label>
  <label>Archivo de datos<input name="path" required value="${esc(c.path)}"></label>
  <label>Token de acceso personal (permiso Contents: lectura y escritura)<input name="token" type="password" required value="${esc(c.token)}"></label>
  <div class="row"><button type="button" data-close>Cancelar</button><button class="pri">Guardar ajustes</button></div></form>`);
  $('#f').onsubmit=e=>{ e.preventDefault(); const f=e.target;
    LS.setItem('gh',JSON.stringify({owner:f.owner.value.trim(),repo:f.repo.value.trim(),branch:f.branch.value.trim(),path:f.path.value.trim(),token:f.token.value.trim()}));
    admin=true; LS.setItem('admin','1'); closeDlg(); load(); toast('Modo administrador activo'); };
}
async function publish(){
  const c=cfg(); if(!c?.token) return settings();
  const api=`https://api.github.com/repos/${c.owner}/${c.repo}/contents/${c.path}`, h={Authorization:'Bearer '+c.token,Accept:'application/vnd.github+json'};
  try{
    toast('Publicando…');
    const g=await fetch(`${api}?ref=${c.branch}`,{headers:h}); const sha=g.ok?(await g.json()).sha:undefined;
    const r=await fetch(api,{method:'PUT',headers:h,body:JSON.stringify({message:'Actualizar recursos',branch:c.branch,sha,content:btoa(unescape(encodeURIComponent(JSON.stringify(data,null,2))))})});
    if(!r.ok) throw new Error((await r.json()).message);
    LS.removeItem('draft'); dirty=false; render(); toast('Publicado. Puede tardar 1 o 2 minutos en verse.');
  }catch(e){ toast('No se pudo publicar: '+e.message); }
}
function exportJson(){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); a.download='data.json'; a.click(); }
function importJson(){ const i=document.createElement('input'); i.type='file'; i.accept='.json'; i.onchange=async()=>{ try{ const d=JSON.parse(await i.files[0].text()); if(!Array.isArray(d.categories)||!Array.isArray(d.items)) throw 0; data=d; save(); toast('Datos importados'); }catch{ toast('Archivo no válido'); } }; i.click(); }

function act(a,x,y){
  const cur=catOf(x);
  const A={
    newItem:()=>itemForm(), editItem:()=>itemForm(x), catMgr, settings, publish, export:exportJson, import:importJson,
    delItem:()=>{ if(confirm('¿Eliminar este recurso?')){ data.items=data.items.filter(i=>i.id!==x); save(); } },
    logout:()=>{ admin=false; LS.setItem('admin','0'); render(); },
    addCat:()=>{ const n=prompt('Nombre de la categoría'); if(n?.trim()){ const ic=prompt('Ícono (un emoji)','📁')||'📁'; data.categories.push({id:uid(),name:n.trim(),icon:ic,subs:[]}); save(); catMgr(); } },
    renCat:()=>{ const n=prompt('Nuevo nombre',cur.name); if(n?.trim()){ cur.name=n.trim(); save(); catMgr(); } },
    iconCat:()=>{ const n=prompt('Nuevo ícono (emoji)',cur.icon); if(n?.trim()){ cur.icon=n.trim(); save(); catMgr(); } },
    delCat:()=>{ const n=data.items.filter(i=>i.cat===x).length; if(confirm(`¿Eliminar “${cur.name}”${n?` y sus ${n} recursos`:''}?`)){ data.categories=data.categories.filter(c=>c.id!==x); data.items=data.items.filter(i=>i.cat!==x); if(cat===x) cat='all'; sub=''; save(); catMgr(); } },
    addSub:()=>{ const n=prompt('Nombre de la subcategoría'); if(n?.trim()){ (cur.subs=cur.subs||[]).push({id:uid(),name:n.trim()}); save(); catMgr(); } },
    renSub:()=>{ const s=cur.subs.find(s=>s.id===y), n=prompt('Nuevo nombre',s.name); if(n?.trim()){ s.name=n.trim(); save(); catMgr(); } },
    delSub:()=>{ if(confirm('¿Eliminar subcategoría? Sus recursos quedarán sin subcategoría.')){ cur.subs=cur.subs.filter(s=>s.id!==y); data.items.forEach(i=>{ if(i.cat===x&&i.sub===y) i.sub=''; }); if(sub===y) sub=''; save(); catMgr(); } }
  };
  A[a]?.();
}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-close]')) return closeDlg();
  const t=e.target.closest('[data-c],[data-s],[data-act]'); if(!t) return;
  if(t.dataset.c!==undefined){ cat=t.dataset.c; sub=''; render(); }
  else if(t.dataset.s!==undefined){ sub=t.dataset.s; render(); }
  else act(t.dataset.act,t.dataset.a,t.dataset.b);
});
$('#q').oninput=e=>{ q=e.target.value.toLowerCase().trim(); render(); };
$('#adminBtn').onclick=()=>{ if(cfg()?.token){ admin=true; LS.setItem('admin','1'); load(); } else settings(); };
window.addEventListener('beforeunload',e=>{ if(admin&&dirty){ e.preventDefault(); } });

let deferred; window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferred=e; $('#install').hidden=false; });
$('#install').onclick=async()=>{ deferred?.prompt(); await deferred?.userChoice; deferred=null; $('#install').hidden=true; };
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
load();
