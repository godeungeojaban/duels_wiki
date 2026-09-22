'use strict';

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const state = { index:null, current:null, currentPath:'', editing:false, savedRange:null, selectedImage:null, activeRibbon:'home', config:null };
const escapeHtml = s => String(s??'').replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const uid = p => `${p}_${crypto.randomUUID().replaceAll('-','')}`;

async function api(url, options={}) {
  const res = await fetch(url, {cache:'no-store', headers:{'Content-Type':'application/json', ...(options.headers||{})}, ...options});
  let data={}; try{data=await res.json()}catch{}
  if(!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
  return data;
}
function showStatus(msg, error=false){ const el=$('#status'); el.textContent=msg; el.classList.toggle('error',error); el.classList.remove('hidden'); clearTimeout(showStatus.t); showStatus.t=setTimeout(()=>el.classList.add('hidden'),4500); }
function openModal(html){ $('#modal').innerHTML=html; $('#modalBackdrop').classList.remove('hidden'); }
function closeModal(){ $('#modalBackdrop').classList.add('hidden'); $('#modal').innerHTML=''; }
$('#modalBackdrop').addEventListener('mousedown',e=>{if(e.target===e.currentTarget)closeModal()});

function routeFor(cat, doc){ return doc ? `#/c/${encodeURIComponent(cat)}/d/${encodeURIComponent(doc)}` : `#/c/${encodeURIComponent(cat)}`; }
function parseRoute(){ const h=location.hash||'#/'; const m=h.match(/^#\/c\/([^/]+)(?:\/d\/([^/]+))?/); return m?{category:decodeURIComponent(m[1]),doc:m[2]?decodeURIComponent(m[2]):null}:null; }
function navigate(cat,doc){ location.hash=routeFor(cat,doc); }

function sortedCategories(categories){
  return [...(categories||[])].sort((a,b)=>{
    const au=a?.id==='uncategorized'||a?.slug==='미분류';
    const bu=b?.id==='uncategorized'||b?.slug==='미분류';
    if(au!==bu)return au?1:-1;
    return String(a?.name||'').localeCompare(String(b?.name||''),'ko');
  });
}
async function refreshIndex(){ state.index=await api('/api/index'); if(state.index)state.index.categories=sortedCategories(state.index.categories); renderTree(); }
function renderTree(){ const tree=$('#tree'); if(!state.index){tree.innerHTML='<div class="loading">불러오는 중…</div>';return}
  const route=parseRoute();
  let html=`<button class="tree-cat-title tree-root ${route?'':'active'}" data-root><span>DUELS WIKI</span><small>ROOT</small></button>`;
  for(const c of sortedCategories(state.index.categories)){
    const catActive=route?.category===c.slug&&!route?.doc;
    html+=`<div class="tree-cat"><button class="tree-cat-title ${catActive?'active':''}" data-cat="${escapeHtml(c.slug)}"><span>${escapeHtml(c.name)}</span><small>${c.id==='uncategorized'?'SYSTEM':'CATEGORY'}</small></button>`;
    for(const d of c.documents||[]){const active=route?.category===c.slug&&route?.doc===d.slug;html+=`<button class="tree-doc ${active?'active':''}" data-cat="${escapeHtml(c.slug)}" data-doc="${escapeHtml(d.slug)}"><span>${escapeHtml(d.title)}</span></button>`;}
    html+='</div>';
  }
  tree.innerHTML=html;
  $('[data-root]',tree)?.addEventListener('click',()=>{location.hash='#/';closeMobileSidebar()});
  $$('[data-cat]',tree).forEach(b=>b.addEventListener('click',()=>{navigate(b.dataset.cat,b.dataset.doc||null);closeMobileSidebar()}));
}

function oldNodeToHtml(node){ if(!node)return''; if(node.type==='text'){let t=escapeHtml(node.text||''); for(const m of node.marks||[]){ if(m.type==='bold')t=`<strong>${t}</strong>`; else if(m.type==='italic')t=`<em>${t}</em>`; else if(m.type==='strike')t=`<s>${t}</s>`; else if(m.type==='link'){const href=escapeHtml(m.attrs?.href||'#');t=`<a href="${href}">${t}</a>`;} else if(m.type==='textStyle'){const st=[];if(m.attrs?.color)st.push(`color:${m.attrs.color}`);if(m.attrs?.fontSize)st.push(`font-size:${m.attrs.fontSize}`);if(st.length)t=`<span style="${st.join(';')}">${t}</span>`;} } return t; }
  const children=(node.content||[]).map(oldNodeToHtml).join('');
  if(node.type==='doc')return children; if(node.type==='paragraph')return `<p>${children||'<br>'}</p>`; if(node.type==='hardBreak')return'<br>'; if(node.type==='bulletList')return`<ul>${children}</ul>`; if(node.type==='orderedList')return`<ol>${children}</ol>`; if(node.type==='listItem')return`<li>${children}</li>`; if(node.type==='blockquote')return`<blockquote>${children}</blockquote>`;
  if(node.type==='image'){ const a=node.attrs||{}; const src=escapeHtml(a.src||''); const st=[]; if(a.width)st.push(`width:${Number(a.width)}px`); if(a.height)st.push(`height:${Number(a.height)}px`); if(a.rotation)st.push(`transform:rotate(${Number(a.rotation)}deg)`); if(a.align)st.push(`display:block;margin-left:${a.align==='center'?'auto':a.align==='right'?'auto':'0'};margin-right:${a.align==='center'?'auto':'0'}`); return `<img src="${src}" style="${st.join(';')}">`; }
  return children;
}
function normalizeContent(content){ if(content?.type==='wiki-sections-v3') return structuredClone(content); if(content?.type==='wiki-sections'){ const conv=s=>({id:s.id||uid('sec'),title:s.title||'제목 없음',contentHtml:oldNodeToHtml(s.content||{type:'doc'}),children:(s.children||[]).map(conv)}); return {type:'wiki-sections-v3',introHtml:oldNodeToHtml(content.intro||{type:'doc'}),sections:(content.sections||[]).map(conv)}; }
  return {type:'wiki-sections-v3',introHtml:oldNodeToHtml(content||{type:'doc'}),sections:[{id:uid('sec'),title:'개요',contentHtml:'<p></p>',children:[]}]}; }
function mediaSrc(src){ if(!src)return''; if(src.startsWith('/media/'))return'/__media__/'+encodeURIComponent(src.slice(1)); return src; }
function viewHtml(html){ const t=document.createElement('template'); t.innerHTML=html||''; $$('img',t.content).forEach(img=>{const src=img.getAttribute('src')||'';img.setAttribute('src',mediaSrc(src));}); $$('a',t.content).forEach(a=>{const h=a.getAttribute('href')||''; if(h.startsWith('wiki:/'))a.dataset.wikiLink=h;}); return t.innerHTML; }
function storageHtml(el){ const clone=el.cloneNode(true); $$('img',clone).forEach(img=>{let src=img.getAttribute('src')||''; if(src.startsWith('/__media__/')){src='/'+decodeURIComponent(src.slice('/__media__/'.length));img.setAttribute('src',src);} img.classList.remove('selected-image');}); $$('[data-editor-only]',clone).forEach(x=>x.remove()); return clone.innerHTML; }

function sectionAnchor(id){return 'section-'+String(id).replace(/[^a-zA-Z0-9_-]/g,'-')}
function renderToc(sections,prefix='',depth=0){return sections.map((s,i)=>{const n=prefix?`${prefix}.${i+1}`:`${i+1}`;return `<div class="toc-line" style="padding-left:${depth*16}px"><a href="#" data-section-anchor="${sectionAnchor(s.id)}">${n}. ${escapeHtml(s.title||'제목 없음')}</a></div>${renderToc(s.children||[],n,depth+1)}`}).join('')}
function renderSections(sections,selfHash,prefix='',depth=1){return sections.map((s,i)=>{const n=prefix?`${prefix}.${i+1}`:`${i+1}`;return `<section class="section depth-${Math.min(depth,3)}"><h2 id="${sectionAnchor(s.id)}" class="section-title"><a class="number" href="${selfHash}">${n}.</a>${escapeHtml(s.title||'제목 없음')}</h2><div class="section-body wiki-body">${viewHtml(s.contentHtml)}</div>${renderSections(s.children||[],selfHash,n,depth+1)}</section>`}).join('')}
function bindWikiLinks(root){ $$('a[data-wiki-link]',root).forEach(a=>a.addEventListener('click',e=>{e.preventDefault(); const x=a.dataset.wikiLink.slice(6); if(!x||x==='/'){location.hash='#/';return} const p=x.replace(/^\//,'').split('/').map(decodeURIComponent); navigate(p[0],p[1]||null);})); $$('[data-section-anchor]',root).forEach(a=>a.addEventListener('click',e=>{e.preventDefault();document.getElementById(a.dataset.sectionAnchor)?.scrollIntoView({behavior:'smooth',block:'start'});})); }

async function renderRoute(){ state.editing=false; hideToolbar(); state.selectedImage=null; updateOverlay(); const route=parseRoute(); if(!route){await renderHome();return} try{const r=await api(`/api/document?category=${encodeURIComponent(route.category)}${route.doc?`&doc=${encodeURIComponent(route.doc)}`:''}`); state.current=r.document; state.currentPath=r.path; renderDocument(r.document,route);}catch(e){$('#viewPage').innerHTML=`<div class="wiki-card"><h2>문서를 불러올 수 없습니다.</h2><p>${escapeHtml(e.message)}</p></div>`;} }
async function renderHome(){ try{const r=await api('/api/root'); state.current=r.document; state.currentPath=r.path; renderRootDocument(r.document);}catch(e){state.current=null;state.currentPath='';$('#viewPage').innerHTML=`<div class="wiki-card"><h2>Duels Wiki</h2><p>${escapeHtml(e.message)}</p></div>`;$('#editPage').classList.add('hidden');$('#viewPage').classList.remove('hidden');} }
function renderRootDocument(doc){ const c=normalizeContent(doc.content); const self='#/'; $('#viewPage').innerHTML=`<div class="wiki-card"><div class="doc-head"><div><h1>${escapeHtml(doc.title||'Duels Wiki')}</h1></div><div class="doc-actions"><button id="editBtn">문서 편집</button><button id="historyBtn">문서 역사</button></div></div><div class="intro wiki-body">${viewHtml(c.introHtml)}</div>${c.sections.length?`<nav class="toc"><div class="toc-title">목차</div>${renderToc(c.sections)}</nav>`:''}${renderSections(c.sections,self)}</div>`; $('#editPage').classList.add('hidden');$('#viewPage').classList.remove('hidden');bindWikiLinks($('#viewPage'));$('#editBtn').onclick=()=>startRootEdit(doc);$('#historyBtn').onclick=()=>showHistory(); }
function renderDocument(doc,route){ const c=normalizeContent(doc.content); const self=routeFor(route.category,route.doc); $('#viewPage').innerHTML=`<div class="wiki-card"><div class="doc-head"><div><h1>${escapeHtml(doc.title)}</h1></div><div class="doc-actions"><button id="editBtn">문서 편집</button><button id="historyBtn">문서 역사</button></div></div><div class="intro wiki-body">${viewHtml(c.introHtml)}</div>${c.sections.length?`<nav class="toc"><div class="toc-title">목차</div>${renderToc(c.sections)}</nav>`:''}${renderSections(c.sections,self)}</div>`; $('#editPage').classList.add('hidden');$('#viewPage').classList.remove('hidden');bindWikiLinks($('#viewPage'));$('#editBtn').onclick=()=>startEdit(doc,route);$('#historyBtn').onclick=()=>showHistory(); }

function createSectionEditor(section,parentArray,prefix,depth){ const wrap=document.createElement('div');wrap.className='section-edit';wrap.dataset.sectionId=section.id; const idx=parentArray.indexOf(section); const number=prefix?`${prefix}.${idx+1}`:`${idx+1}`; wrap.innerHTML=`<div class="section-edit-head"><span class="section-number">${number}.</span><input class="section-title-input" value="${escapeHtml(section.title)}"></div><div class="editable section-edit-body" contenteditable="true"></div><div class="children"></div><div class="section-controls"><button data-child>＋ 하위</button><button data-next>＋ 다음</button><button data-delete class="danger">삭제</button></div>`; const body=$('.section-edit-body',wrap);body.innerHTML=viewHtml(section.contentHtml); body.addEventListener('input',()=>section.contentHtml=storageHtml(body)); $('.section-title-input',wrap).addEventListener('input',e=>section.title=e.target.value); bindEditable(body);
  $('[data-child]',wrap).onclick=()=>{section.children.push({id:uid('sec'),title:'새 목차',contentHtml:'<p></p>',children:[]});renderSectionTree()}; $('[data-next]',wrap).onclick=()=>{parentArray.splice(parentArray.indexOf(section)+1,0,{id:uid('sec'),title:'새 목차',contentHtml:'<p></p>',children:[]});renderSectionTree()}; $('[data-delete]',wrap).onclick=()=>{if(confirm('이 목차 블록과 하위 블록을 삭제할까요?')){parentArray.splice(parentArray.indexOf(section),1);renderSectionTree()}}; return wrap; }
let editingContent=null;
function appendSections(container,sections,prefix='',depth=1){sections.forEach(s=>{const node=createSectionEditor(s,sections,prefix,depth);container.appendChild(node);const child=$('.children',node);appendSections(child,s.children||[],prefix?`${prefix}.${sections.indexOf(s)+1}`:`${sections.indexOf(s)+1}`,depth+1)});}
function renderSectionTree(){ const root=$('#sectionTree'); if(!root)return; root.innerHTML='';appendSections(root,editingContent.sections); }
function startRootEdit(doc){ state.editing=true; editingContent=normalizeContent(doc.content); $('#viewPage').classList.add('hidden');$('#editPage').classList.remove('hidden');$('#editPage').innerHTML=`<div class="editor-card"><div class="title-block"><input id="docTitle" class="title-block-title" value="${escapeHtml(doc.title||'Duels Wiki')}"><div id="introEditor" class="editable rich" contenteditable="true"></div></div><div id="sectionTree"></div><div class="savebar root-savebar"><span class="muted">루트 문서는 삭제할 수 없습니다.</span><button id="saveBtn" class="primary">문서 저장</button></div></div>`; const intro=$('#introEditor'); intro.innerHTML=viewHtml(editingContent.introHtml);bindEditable(intro);intro.addEventListener('input',()=>editingContent.introHtml=storageHtml(intro));renderSectionTree();showToolbar();$('#saveBtn').onclick=saveRootCurrent; }
async function saveRootCurrent(){ try{ editingContent.introHtml=storageHtml($('#introEditor')); $$('.section-edit').forEach(n=>{const s=findSection(editingContent.sections,n.dataset.sectionId);if(s)s.contentHtml=storageHtml($('.section-edit-body',n));}); await api('/api/root/update',{method:'POST',body:JSON.stringify({title:$('#docTitle').value,content:editingContent})}); showStatus('Duels Wiki 문서를 저장했습니다. GitHub Pages는 Actions 완료 후 갱신됩니다.'); location.hash='#/'; await renderRoute(); }catch(e){showStatus(e.message,true)} }

function startEdit(doc,route){ state.editing=true; editingContent=normalizeContent(doc.content); const cats=state.index.categories; const isInfo=doc.kind==='category-info'; $('#viewPage').classList.add('hidden');$('#editPage').classList.remove('hidden');$('#editPage').innerHTML=`<div class="editor-card"><div class="edit-meta"><select id="categorySelect" ${isInfo?'disabled':''}>${cats.map(c=>`<option value="${escapeHtml(c.slug)}" ${c.slug===route.category?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select></div><div class="title-block"><input id="docTitle" class="title-block-title" value="${escapeHtml(doc.title)}" ${isInfo?'disabled':''}><div id="introEditor" class="editable rich" contenteditable="true"></div></div><div id="sectionTree"></div><div class="savebar"><button id="deleteBtn" class="danger">${isInfo?'카테고리 삭제':'문서 삭제'}</button><button id="saveBtn" class="primary">문서 저장</button></div></div>`; const intro=$('#introEditor'); intro.innerHTML=viewHtml(editingContent.introHtml);bindEditable(intro);intro.addEventListener('input',()=>editingContent.introHtml=storageHtml(intro));renderSectionTree();showToolbar();$('#saveBtn').onclick=()=>saveCurrent(route,isInfo);$('#deleteBtn').onclick=()=>deleteCurrent(route,isInfo); }
async function saveCurrent(route,isInfo){ try{ editingContent.introHtml=storageHtml($('#introEditor')); $$('.section-edit').forEach(n=>{const s=findSection(editingContent.sections,n.dataset.sectionId);if(s)s.contentHtml=storageHtml($('.section-edit-body',n));}); await api('/api/document/update',{method:'POST',body:JSON.stringify({category:route.category,doc:route.doc,title:$('#docTitle').value,nextCategory:$('#categorySelect').value,content:editingContent})}); showStatus('저장했습니다. GitHub Pages는 Actions 완료 후 갱신됩니다.'); await refreshIndex(); const nextCat=isInfo?route.category:$('#categorySelect').value;const nextDoc=isInfo?null:safeSlugClient($('#docTitle').value); navigate(nextCat,nextDoc); }catch(e){showStatus(e.message,true)} }
async function deleteCurrent(route,isInfo){if(!confirm(isInfo?'정보 문서를 삭제하면 카테고리가 삭제되고 하위 문서는 미분류로 이동합니다. 계속할까요?':'이 문서를 삭제할까요?'))return;try{await api(`/api/document?category=${encodeURIComponent(route.category)}${route.doc?`&doc=${encodeURIComponent(route.doc)}`:''}`,{method:'DELETE'});await refreshIndex();location.hash='#/';showStatus('삭제했습니다.')}catch(e){showStatus(e.message,true)}}
function findSection(list,id){for(const s of list){if(s.id===id)return s;const f=findSection(s.children||[],id);if(f)return f}return null}
function safeSlugClient(v){return String(v).trim().replace(/[\\/:*?"<>|#%]/g,'-').replace(/\s+/g,' ').replace(/^[ .]+|[ .]+$/g,'')}

function showToolbar(){ $('#ribbon').classList.remove('hidden'); document.body.classList.add('editing-mode'); switchRibbon('home'); }
function hideToolbar(){ $('#ribbon').classList.add('hidden'); document.body.classList.remove('editing-mode'); clearObjectSelection(); }

function switchRibbon(name){
  if(!state.editing)return;
  state.activeRibbon=name;
  $$('.ribbon-tab').forEach(b=>b.classList.toggle('active',b.dataset.ribbonTab===name));
  $$('.ribbon-panel').forEach(p=>p.classList.toggle('active',p.dataset.ribbonPanel===name));
}
$$('.ribbon-tab').forEach(b=>b.addEventListener('click',()=>switchRibbon(b.dataset.ribbonTab)));
$('#ribbon').addEventListener('mousedown',e=>{ if(e.target.closest('button'))e.preventDefault(); });
$('.ribbon-panels').addEventListener('wheel',e=>{const t=e.currentTarget;if(t.scrollWidth>t.clientWidth){e.preventDefault();e.stopPropagation();t.scrollLeft+=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;}},{passive:false});

function bindEditable(el){
  el.addEventListener('mouseup',rememberSelection);
  el.addEventListener('keyup',rememberSelection);
  el.addEventListener('click',e=>{
    if(e.target.tagName==='IMG'){ selectImage(e.target); return; }
    if(!e.target.closest('img')) clearObjectSelection(true);
  });
}
function rememberSelection(){ const sel=getSelection(); if(sel.rangeCount&&state.editing){ const r=sel.getRangeAt(0); if($('#editPage')?.contains(r.commonAncestorContainer))state.savedRange=r.cloneRange(); } }
function restoreSelection(){ if(!state.savedRange)return; const sel=getSelection(); sel.removeAllRanges(); sel.addRange(state.savedRange); }
function exec(cmd,value=null){ restoreSelection(); document.execCommand(cmd,false,value); rememberSelection(); }
$$('[data-cmd]').forEach(b=>b.onclick=()=>exec(b.dataset.cmd));
$$('[data-align]').forEach(b=>b.onclick=()=>exec(b.dataset.align==='left'?'justifyLeft':b.dataset.align==='center'?'justifyCenter':b.dataset.align==='right'?'justifyRight':'justifyFull'));
$('#textColor').oninput=e=>exec('foreColor',e.target.value);
$('#highlightColor').oninput=e=>exec('hiliteColor',e.target.value);
$('#fontSizeInput').onchange=e=>applyFontSize(Number(e.target.value)||16);
$('#clearFormatBtn').onclick=()=>{exec('removeFormat');exec('unlink');};
function applyFontSize(px){ restoreSelection(); document.execCommand('fontSize',false,'7'); $$('font[size="7"]',$('#editPage')).forEach(f=>{const span=document.createElement('span');span.style.fontSize=`${Math.max(8,Math.min(96,px))}px`;span.innerHTML=f.innerHTML;f.replaceWith(span)}); rememberSelection(); }
function currentBlocks(){
  const sel=getSelection(); if(!sel.rangeCount)return[]; const range=sel.getRangeAt(0); const root=range.commonAncestorContainer.nodeType===1?range.commonAncestorContainer:range.commonAncestorContainer.parentElement; const editable=root?.closest?.('.editable'); if(!editable)return[];
  const candidates=$$('p,div,li,blockquote',editable).filter(x=>{try{return range.intersectsNode(x)}catch{return false}});
  if(candidates.length)return candidates.filter(x=>!candidates.some(y=>y!==x&&y.contains(x)));
  const n=(sel.anchorNode?.nodeType===1?sel.anchorNode:sel.anchorNode?.parentElement)?.closest('p,div,li,blockquote'); return n?[n]:[editable];
}
$('#lineHeightSelect').onchange=e=>{currentBlocks().forEach(x=>x.style.lineHeight=e.target.value);rememberSelection()};
$('#paragraphSpacingInput').onchange=e=>{const v=Math.max(0,Math.min(80,Number(e.target.value)||0));currentBlocks().forEach(x=>x.style.marginBottom=`${v}px`);rememberSelection()};
$('#unlinkBtn').onclick=()=>exec('unlink');

function openInternalLink(){
  rememberSelection(); const cats=state.index?.categories||[];
  openModal(`<h2>내부 링크</h2><div class="form-row"><label>카테고리</label><select id="linkCat"><option value="__all__">Duels Wiki (전체)</option>${cats.map(c=>`<option value="${escapeHtml(c.slug)}">${escapeHtml(c.name)}</option>`).join('')}</select></div><div id="linkChoices" class="link-list"></div><div class="modal-actions"><button id="cancelLink">취소</button></div>`);
  const select=$('#linkCat');
  const draw=()=>{const v=select.value,box=$('#linkChoices');if(v==='__all__')box.innerHTML='<button class="link-choice" data-href="wiki:/">Duels Wiki / 전체</button>';else{const c=cats.find(x=>x.slug===v);box.innerHTML=(c?.hasInfo?`<button class="link-choice" data-href="wiki:/${encodeURIComponent(v)}">${escapeHtml(c.name)} / 정보</button>`:'')+(c?.documents||[]).map(d=>`<button class="link-choice" data-href="wiki:/${encodeURIComponent(v)}/${encodeURIComponent(d.slug)}">${escapeHtml(d.title)}</button>`).join('')} $$('.link-choice',box).forEach(b=>b.onclick=()=>{restoreSelection();document.execCommand('createLink',false,b.dataset.href);closeModal();rememberSelection()})};
  select.onchange=draw;draw();$('#cancelLink').onclick=closeModal;
}
$('#internalLinkBtn').onclick=openInternalLink; $('#insertLinkBtn').onclick=openInternalLink;

function normalizeImageUrl(url){try{const u=new URL(url);if(u.hostname==='github.com'){const p=u.pathname.split('/').filter(Boolean),bi=p.indexOf('blob');if(bi>=2&&p[bi+1])return `https://raw.githubusercontent.com/${p[0]}/${p[1]}/${p[bi+1]}/${p.slice(bi+2).join('/')}`;}return url}catch{return url}}
$('#imageUrlBtn').onclick=()=>{openModal(`<h2>그림 링크 삽입</h2><div class="form-row"><label>PNG/JPG 이미지 URL</label><input id="imageUrl" placeholder="https://github.com/.../blob/.../image.png"></div><div class="modal-actions"><button id="cancelImage">취소</button><button id="insertImage" class="primary">삽입</button></div>`);$('#cancelImage').onclick=closeModal;$('#insertImage').onclick=()=>{const url=normalizeImageUrl($('#imageUrl').value.trim());if(!/\.(png|jpe?g)(\?|$)/i.test(url)){alert('PNG/JPG 링크만 사용할 수 있습니다.');return}insertImage(url);closeModal()}};
$('#imageUploadBtn').onclick=()=>$('#imageFile').click();
$('#imageFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;if(!['image/png','image/jpeg'].includes(f.type)){showStatus('PNG/JPG만 업로드할 수 있습니다.',true);return}const data=await fileDataUrl(f);try{const r=await api('/api/media',{method:'POST',body:JSON.stringify({filename:f.name,data})});insertImage(r.src);showStatus('그림을 GitHub 저장소에 업로드했습니다.')}catch(err){showStatus(err.message,true)}e.target.value=''};
function fileDataUrl(f){return new Promise((res,rej)=>{const r=new FileReader;r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)})}
function imageAvailableWidth(img){
  const host=img.closest('.editable');
  if(host){const w=host.getBoundingClientRect().width;if(w>20)return w}
  return 480;
}
function initializeInsertedImage(img){
  const apply=()=>{
    const nw=img.naturalWidth||480,nh=img.naturalHeight||Math.max(1,nw*0.75);
    const maxW=Math.max(20,imageAvailableWidth(img));
    const w=Math.max(20,Math.min(480,nw,maxW));
    const h=Math.max(20,w*(nh/Math.max(1,nw)));
    img.style.width=`${Math.round(w)}px`;
    img.style.height=`${Math.round(h)}px`;
    img.style.maxWidth='100%';
    img.dataset.aspectRatio=String(nw/Math.max(1,nh));
    if(state.selectedImage===img){updateImageTools();updateOverlay()}
  };
  if(img.complete&&img.naturalWidth>0)apply();else img.addEventListener('load',apply,{once:true});
}
function insertImage(src){
  const img=document.createElement('img');img.style.display='block';img.style.maxWidth='100%';img.style.width='1px';img.style.height='1px';img.alt='';
  restoreSelection();const range=getSelection()?.rangeCount?getSelection().getRangeAt(0):null;
  const editable=range&&(range.commonAncestorContainer.nodeType===1?range.commonAncestorContainer:range.commonAncestorContainer.parentElement)?.closest?.('.editable');
  if(range&&editable){range.deleteContents();range.insertNode(img);range.setStartAfter(img);range.collapse(true)}
  else {showStatus('그림을 삽입할 편집 위치를 먼저 선택하세요.',true);return}
  img.src=src;initializeInsertedImage(img);selectImage(img);rememberSelection();
}
function selectImage(img){ state.selectedImage=img; $$('.selected-image').forEach(x=>x.classList.remove('selected-image')); img.classList.add('selected-image'); $('#pictureTabBtn').classList.remove('hidden'); updateImageTools(); updateOverlay(); switchRibbon('picture'); }
function updateImageTools(){const img=state.selectedImage;if(!img)return;const r=img.getBoundingClientRect();$('#imageWidth').value=Math.round(r.width);$('#imageHeight').value=Math.round(r.height);$('#imageRotation').value=getRotation(img);$('#pictureBorderWidth').value=parseFloat(img.style.borderWidth)||0;const bc=rgbToHex(img.style.borderColor);if(bc)$('#pictureBorderColor').value=bc;$('#imageWrapSelect').value=getImageWrap(img)}
function rgbToHex(v){if(!v)return null;if(/^#/.test(v))return v;const m=v.match(/\d+/g);if(!m||m.length<3)return null;return '#'+m.slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join('')}
function getRotation(img){const m=(img.style.transform||'').match(/rotate\((-?[\d.]+)deg\)/);return m?Number(m[1]):0}
function applyImageNumbers(){const img=state.selectedImage;if(!img)return;img.style.width=`${Math.max(20,Number($('#imageWidth').value)||20)}px`;img.style.height=`${Math.max(20,Number($('#imageHeight').value)||20)}px`;img.style.transform=`rotate(${Number($('#imageRotation').value)||0}deg)`;img.style.maxWidth='100%';updateOverlay()}
['imageWidth','imageHeight','imageRotation'].forEach(id=>$('#'+id).addEventListener('change',applyImageNumbers));
$('#rotateLeftBtn').onclick=()=>{if(!state.selectedImage)return;$('#imageRotation').value=getRotation(state.selectedImage)-90;applyImageNumbers()};
$('#rotateRightBtn').onclick=()=>{if(!state.selectedImage)return;$('#imageRotation').value=getRotation(state.selectedImage)+90;applyImageNumbers()};
$('#imageFitBtn').onclick=()=>{const img=state.selectedImage;if(!img)return;img.style.width='100%';img.style.height='auto';updateImageTools();updateOverlay()};
$('#pictureResetBtn').onclick=()=>{const img=state.selectedImage;if(!img)return;img.style.width='auto';img.style.height='auto';img.style.maxWidth='100%';img.style.transform='rotate(0deg)';setTimeout(()=>{updateImageTools();updateOverlay()},0)};
$('#pictureAltBtn').onclick=()=>{const img=state.selectedImage;if(!img)return;const v=prompt('그림의 대체 텍스트',img.alt||'');if(v!==null)img.alt=v};
$('#pictureBorderColor').oninput=e=>{if(state.selectedImage){state.selectedImage.style.borderColor=e.target.value;state.selectedImage.style.borderStyle='solid'}};
$('#pictureBorderWidth').onchange=e=>{if(state.selectedImage){const v=Math.max(0,Math.min(20,Number(e.target.value)||0));state.selectedImage.style.borderWidth=`${v}px`;state.selectedImage.style.borderStyle=v?'solid':'none';updateOverlay()}};
$$('[data-image-align]').forEach(b=>b.onclick=()=>setImageAlign(b.dataset.imageAlign));
function setImageAlign(a){const img=state.selectedImage;if(!img)return;img.style.float='none';img.style.display='block';img.style.marginLeft=a==='center'||a==='right'?'auto':'0';img.style.marginRight=a==='center'||a==='left'?'auto':'0';updateOverlay()}
function getImageWrap(img){if(img.style.float==='left')return'float-left';if(img.style.float==='right')return'float-right';if(img.style.display==='inline-block')return'inline';return'block'}
$('#imageWrapSelect').onchange=e=>{const img=state.selectedImage;if(!img)return;const v=e.target.value;img.style.float='none';img.style.margin='0';if(v==='inline'){img.style.display='inline-block';img.style.verticalAlign='middle'}else if(v==='float-left'){img.style.display='block';img.style.float='left';img.style.margin='0 14px 8px 0'}else if(v==='float-right'){img.style.display='block';img.style.float='right';img.style.margin='0 0 8px 14px'}else{img.style.display='block';img.style.float='none';img.style.margin='8px 0'}updateOverlay()};
function updateOverlay(){const ov=$('#imageOverlay'),img=state.selectedImage;if(!img||!state.editing||!document.body.contains(img)){ov.classList.add('hidden');return}const r=img.getBoundingClientRect();ov.style.left=`${r.left}px`;ov.style.top=`${r.top}px`;ov.style.width=`${r.width}px`;ov.style.height=`${r.height}px`;ov.classList.remove('hidden')}
window.addEventListener('scroll',updateOverlay,true);window.addEventListener('resize',updateOverlay);
$$('#imageOverlay i').forEach(h=>h.addEventListener('pointerdown',startImageResize));
function startImageResize(e){
  const img=state.selectedImage;if(!img)return;e.preventDefault();
  const start=img.getBoundingClientRect();
  if(start.width<1||start.height<1){initializeInsertedImage(img);return}
  const x=e.clientX,y=e.clientY,handle=e.currentTarget.dataset.h;
  const stored=Number(img.dataset.aspectRatio);
  const ratio=stored>0?stored:(start.width/Math.max(1,start.height));
  const isCorner=handle.length===2;
  const move=ev=>{
    const dx=ev.clientX-x,dy=ev.clientY-y;let w=start.width,h=start.height;
    if(handle.includes('e'))w=start.width+dx;if(handle.includes('w'))w=start.width-dx;
    if(handle.includes('s'))h=start.height+dy;if(handle.includes('n'))h=start.height-dy;
    if(isCorner){
      if(Math.abs(dx)>=Math.abs(dy))h=w/ratio;else w=h*ratio;
    }
    const maxW=Math.max(20,imageAvailableWidth(img));
    w=Math.max(20,Math.min(w,maxW));h=Math.max(20,h);
    if(isCorner)h=w/ratio;
    img.style.width=`${Math.round(w)}px`;img.style.height=`${Math.round(h)}px`;img.style.maxWidth='100%';
    updateImageTools();updateOverlay();
  };
  const up=()=>{removeEventListener('pointermove',move);removeEventListener('pointerup',up)};
  addEventListener('pointermove',move);addEventListener('pointerup',up);
}

function clearImageSelection(){if(state.selectedImage)state.selectedImage.classList.remove('selected-image');state.selectedImage=null;$('#pictureTabBtn').classList.add('hidden');updateOverlay()}
function clearObjectSelection(switchHome=true){clearImageSelection();if(switchHome&&state.editing)switchRibbon('home')}

function clearObjectSelectionOnOutside(e){if(e.target.closest('.editable')||e.target.closest('#ribbon')||e.target.closest('#imageOverlay')||e.target.closest('.modal'))return;clearObjectSelection();}
document.addEventListener('mousedown',clearObjectSelectionOnOutside);

async function showHistory(){try{const r=await api(`/api/history?path=${encodeURIComponent(state.currentPath)}`);openModal(`<h2>문서 역사</h2>${r.history.length?r.history.map(x=>`<div class="history-row"><div><code>${escapeHtml(x.sha)}</code> · ${escapeHtml(x.author)}</div><div>${escapeHtml(x.message)}</div><div class="muted">${escapeHtml(x.date)}</div></div>`).join(''):'<p>수정 이력이 없습니다.</p>'}<div class="modal-actions"><button id="closeHistory">닫기</button></div>`);$('#closeHistory').onclick=closeModal}catch(e){showStatus(e.message,true)}}

$('#newCategoryBtn').onclick=()=>{openModal(`<h2>카테고리 생성</h2><div class="form-row"><label>카테고리 이름</label><input id="newCatName"></div><div class="modal-actions"><button id="cancelNewCat">취소</button><button id="createNewCat" class="primary">생성</button></div>`);$('#cancelNewCat').onclick=closeModal;$('#createNewCat').onclick=async()=>{try{const r=await api('/api/category',{method:'POST',body:JSON.stringify({name:$('#newCatName').value})});closeModal();await refreshIndex();navigate(r.category.slug,null)}catch(e){alert(e.message)}}};
$('#newDocumentBtn').onclick=()=>{const cats=sortedCategories(state.index?.categories||[]);openModal(`<h2>문서 생성</h2><div class="form-row"><label>카테고리</label><select id="newDocCat">${cats.map(c=>`<option value="${escapeHtml(c.slug)}">${escapeHtml(c.name)}</option>`).join('')}</select></div><div class="form-row"><label>문서 제목</label><input id="newDocTitle"></div><div class="modal-actions"><button id="cancelNewDoc">취소</button><button id="createNewDoc" class="primary">생성</button></div>`);$('#cancelNewDoc').onclick=closeModal;$('#createNewDoc').onclick=async()=>{try{const cat=$('#newDocCat').value,title=$('#newDocTitle').value;const r=await api('/api/document/create',{method:'POST',body:JSON.stringify({category:cat,title,content:{type:'wiki-sections-v3',introHtml:'<p></p>',sections:[{id:uid('sec'),title:'개요',contentHtml:'<p></p>',children:[]}]}})});closeModal();await refreshIndex();navigate(cat,r.document.slug)}catch(e){alert(e.message)}}};

$('#settingsBtn').onclick=async()=>{const c=state.config||await api('/api/config');openModal(`<h2>GitHub 설정</h2><div class="form-row"><label>Owner</label><input id="cfgOwner" value="${escapeHtml(c.owner)}"></div><div class="form-row"><label>Repository</label><input id="cfgRepo" value="${escapeHtml(c.repo)}"></div><div class="form-row"><label>Branch</label><input id="cfgBranch" value="${escapeHtml(c.branch)}"></div><div class="form-row"><label>Fine-grained PAT (Contents: Read and write)</label><input id="cfgToken" type="password" placeholder="${c.tokenConfigured?'이미 저장됨 — 변경할 때만 입력':'github_pat_...'}"></div><p class="muted">토큰은 GitHub에 업로드되지 않고 이 PC의 로컬 설정에만 저장됩니다.</p><div class="modal-actions"><button id="cancelCfg">취소</button><button id="saveCfg" class="primary">저장</button></div>`);$('#cancelCfg').onclick=closeModal;$('#saveCfg').onclick=async()=>{try{const body={owner:$('#cfgOwner').value,repo:$('#cfgRepo').value,branch:$('#cfgBranch').value};if($('#cfgToken').value)body.token=$('#cfgToken').value;await api('/api/token',{method:'POST',body:JSON.stringify(body)});closeModal();location.reload()}catch(e){alert(e.message)}}};
function closeMobileSidebar(){ $('#sidebar').classList.remove('open');$('#sidebarScrim').classList.remove('open'); }
function toggleMobileSidebar(){const open=!$('#sidebar').classList.contains('open');$('#sidebar').classList.toggle('open',open);$('#sidebarScrim').classList.toggle('open',open)}
$('#sidebarToggle').onclick=toggleMobileSidebar;
$('#sidebarScrim').onclick=closeMobileSidebar;
window.addEventListener('resize',()=>{if(innerWidth>760)closeMobileSidebar()});
window.addEventListener('hashchange',()=>{if(state.editing&&!confirm('편집 중인 변경사항이 저장되지 않을 수 있습니다. 이동할까요?'))return;renderTree();renderRoute()});

(async function init(){try{state.config=await api('/api/config'); if(!state.config.tokenConfigured)showStatus('GitHub Token을 설정하면 편집/저장이 가능합니다.');await refreshIndex();await renderRoute();}catch(e){showStatus(e.message,true);$('#viewPage').innerHTML=`<div class="wiki-card"><h2>초기화 실패</h2><p>${escapeHtml(e.message)}</p><p>우측 상단 GitHub 설정에서 저장소와 토큰을 확인해주세요.</p></div>`}})();
