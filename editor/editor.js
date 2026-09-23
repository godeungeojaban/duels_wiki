'use strict';

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const state = { index:null, current:null, currentPath:'', editing:false, savedRange:null, componentInsertionRange:null, footnoteInsertionRange:null, footnoteInsertionEditable:null, lastEditable:null, selectedImage:null, activeRibbon:'home', config:null, duelsData:null, duelsDataError:'' };
const escapeHtml = s => String(s??'').replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const uid = p => `${p}_${crypto.randomUUID().replaceAll('-','')}`;
const DUELS_CHARACTER_PROFILES=Object.freeze([
  Object.freeze({id:'shubi',name:'슈비',color:'#ff4500'}),
  Object.freeze({id:'ruvu',name:'루뷰',color:'#00aaff'}),
  Object.freeze({id:'miaruky',name:'미아루키',color:'#ff1493'}),
  Object.freeze({id:'mainmad',name:'메인마드',color:'#795548'}),
  Object.freeze({id:'mehugu',name:'메후구',color:'#00e676'}),
  Object.freeze({id:'lian',name:'리안',color:'#ffa500'}),
  Object.freeze({id:'tau',name:'타우',color:'#00ffff'}),
  Object.freeze({id:'veleu',name:'베르',color:'#ff2244'}),
  Object.freeze({id:'elin',name:'엘린',color:'#c8d8f0'}),
  Object.freeze({id:'nsonya',name:'엔소냐',color:'#ee00ff'}),
  Object.freeze({id:'maisil',name:'메이실',color:'#ffd700'}),
  Object.freeze({id:'erapabi',name:'에라 파비',color:'#38bdf8'}),
  Object.freeze({id:'reika',name:'레이카',color:'#ff7a00'}),
  Object.freeze({id:'shairaz',name:'샤이라즈',color:'#78909c'}),
  Object.freeze({id:'phase',name:'페이즈',color:'#8855ff'}),
  Object.freeze({id:'kan',name:'칸',color:'#1a6b35'}),
  Object.freeze({id:'cherity',name:'체리티',color:'#6b0f1a'}),
  Object.freeze({id:'konyeong',name:'코녕',color:'#f5e6c8'}),
  Object.freeze({id:'herjang',name:'헤르쟝',color:'#00c897'}),
  Object.freeze({id:'hatsuhats',name:'하츠하츠',color:'#aaff00'}),
  Object.freeze({id:'prill',name:'프릴',color:'#ff69b4'}),
  Object.freeze({id:'dazbin',name:'다즈빈',color:'#3355ff'}),
  Object.freeze({id:'yui',name:'유이',color:'#6e97ff'}),
  Object.freeze({id:'peluna',name:'펠루나',color:'#555555'}),
  Object.freeze({id:'sherina',name:'셰리나 비아',color:'#6a36c9'}),
  Object.freeze({id:'sya',name:'스야',color:'#0000ad'}),
  Object.freeze({id:'runef',name:'루네프',color:'#4c10c4'}),
  Object.freeze({id:'roon',name:'로온',color:'#a5f9a6'}),
  Object.freeze({id:'intu',name:'인투',color:'#a18a8a'}),
  Object.freeze({id:'meramona',name:'메라 모나',color:'#ff21da'}),
  Object.freeze({id:'tadta',name:'타다타',color:'#2f7a40'}),
  Object.freeze({id:'nanamnang',name:'나남낭',color:'#fbc7ff'}),
  Object.freeze({id:'raise',name:'레이즈',color:'#bfa136'}),
  Object.freeze({id:'levina',name:'레비나',color:'#a63b46'}),
  Object.freeze({id:'ki',name:'키',color:'#c3c9de'}),
  Object.freeze({id:'sor',name:'소르',color:'#4d4d8f'}),
  Object.freeze({id:'jerry',name:'제리',color:'#59c980'}),
  Object.freeze({id:'ruli',name:'룰리',color:'#e6dd85'}),
  Object.freeze({id:'lete',name:'레테',color:'#a7b0a4'}),
  Object.freeze({id:'clea',name:'클레아',color:'#213b5a'}),
  Object.freeze({id:'shello',name:'셸로',color:'#522a50'}),
  Object.freeze({id:'tinya',name:'티냐',color:'#92cbd6'}),
  Object.freeze({id:'lime',name:'라임',color:'#c1fab1'}),
  Object.freeze({id:'quri',name:'큐리',color:'#8b6cd9'}),
  Object.freeze({id:'hapupu',name:'하푸푸',color:'#ffe6f7'}),
  Object.freeze({id:'atsuteo',name:'아츠테오',color:'#735800'}),
  Object.freeze({id:'nare',name:'나레',color:'#b8dcff'}),
  Object.freeze({id:'kines',name:'키네스',color:'#910101'}),
  Object.freeze({id:'ezrail',name:'에즈레일',color:'#6f82a8'}),
  Object.freeze({id:'nyu',name:'뉴',color:'#c64a73'}),
  Object.freeze({id:'gae',name:'가에',color:'#7f8992'}),
  Object.freeze({id:'cyien',name:'사이엔',color:'#4f79aa'}),
  Object.freeze({id:'kanon',name:'카논',color:'#c94141'}),
  Object.freeze({id:'deltroove',name:'델트루브',color:'#b5652b'}),
  Object.freeze({id:'xianelli',name:'시아넬리',color:'#8b1223'}),
]);
const DUELS_CHARACTER_COLORS=DUELS_CHARACTER_PROFILES;
const DUELS_CHARACTER_IMAGE_BASE='https://raw.githubusercontent.com/LyangNem/Duels/main/character/';
const DUELS_CHARACTER_IMAGE_PRELOADS=[];
function preloadDuelsCharacterImages(){
  if(DUELS_CHARACTER_IMAGE_PRELOADS.length)return;
  for(const character of DUELS_CHARACTER_PROFILES){
    const image=new Image();
    image.decoding='async';
    image.loading='eager';
    image.src=`${DUELS_CHARACTER_IMAGE_BASE}${character.id}.png`;
    DUELS_CHARACTER_IMAGE_PRELOADS.push(image);
  }
}
preloadDuelsCharacterImages();

function characterColorButtons(){return DUELS_CHARACTER_COLORS.map(x=>`<button type="button" class="character-color-swatch" data-color="${x.color}" title="${escapeHtml(x.name)} · ${x.color}"><i style="background:${x.color}"></i><span>${escapeHtml(x.name)}</span></button>`).join('')}
function characterImageButtons(){return DUELS_CHARACTER_PROFILES.map(x=>{const url=`${DUELS_CHARACTER_IMAGE_BASE}${x.id}.png`;return `<button type="button" class="character-image-swatch" data-image-url="${url}" title="${escapeHtml(x.name)}"><img src="${url}" alt=""><span>${escapeHtml(x.name)}</span></button>`}).join('')}
function closeFloatingPresetGrids(){document.querySelectorAll('.character-color-floating-grid,.character-image-floating-grid').forEach(x=>x.remove())}
function positionFloatingGrid(grid,summary,maxWidth=430){
  const r=summary.getBoundingClientRect(),pad=8;
  const w=Math.min(maxWidth,window.innerWidth-pad*2);
  let left=r.left,top=r.bottom+6;
  grid.style.width=`${Math.max(220,w)}px`;
  if(left+w>window.innerWidth-pad)left=Math.max(pad,window.innerWidth-pad-w);
  grid.style.left=`${Math.max(pad,left)}px`;grid.style.top=`${Math.max(pad,top)}px`;
  requestAnimationFrame(()=>{const gr=grid.getBoundingClientRect();if(gr.bottom>window.innerHeight-pad)grid.style.top=`${Math.max(pad,r.top-gr.height-6)}px`});
}
function openFloatingCharacterColors(summary,input){
  closeFloatingPresetGrids();
  const grid=document.createElement('div');grid.className='character-color-grid character-color-floating-grid';grid.innerHTML=characterColorButtons();document.body.appendChild(grid);
  positionFloatingGrid(grid,summary,430);
  grid.addEventListener('mousedown',e=>e.preventDefault());
  grid.addEventListener('click',e=>{const button=e.target.closest('[data-color]');if(!button)return;input.value=button.dataset.color;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));closeFloatingPresetGrids()});
}
function openFloatingCharacterImages(summary,input){
  closeFloatingPresetGrids();
  const grid=document.createElement('div');grid.className='character-image-grid character-image-floating-grid';grid.innerHTML=characterImageButtons();document.body.appendChild(grid);
  positionFloatingGrid(grid,summary,500);
  grid.addEventListener('mousedown',e=>e.preventDefault());
  grid.addEventListener('click',e=>{const button=e.target.closest('[data-image-url]');if(!button)return;input.value=button.dataset.imageUrl;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));closeFloatingPresetGrids()});
}
function bindFloatingPresetDetails(details,input,kind){
  const summary=details.querySelector('summary');
  summary.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();
    const selector=kind==='color'?'.character-color-floating-grid':'.character-image-floating-grid';
    const already=!!document.querySelector(selector);
    if(already){closeFloatingPresetGrids();details.open=false;return}
    details.open=true;
    if(kind==='color')openFloatingCharacterColors(summary,input);else openFloatingCharacterImages(summary,input);
  });
}
function enhanceColorInputs(root=document){
  $$('input[type="color"]',root).forEach(input=>{
    if(input.dataset.duelsCharacterColors==='1')return;
    input.dataset.duelsCharacterColors='1';
    const details=document.createElement('details');details.className='character-color-presets';details.innerHTML='<summary>캐릭터 색</summary>';
    const host=input.closest('label.color-tool');if(host)host.insertAdjacentElement('afterend',details);else input.insertAdjacentElement('afterend',details);
    bindFloatingPresetDetails(details,input,'color');
  });
}
function enhanceImageUrlInputs(root=document){
  $$('input[data-character-image-presets],#imageUrl,#ccImage',root).forEach(input=>{
    if(input.dataset.duelsCharacterImages==='1')return;
    input.dataset.duelsCharacterImages='1';
    const details=document.createElement('details');details.className='character-image-presets';details.innerHTML='<summary>캐릭터 이미지</summary>';
    input.insertAdjacentElement('afterend',details);
    bindFloatingPresetDetails(details,input,'image');
  });
}
document.addEventListener('mousedown',e=>{if(!e.target.closest('.character-color-floating-grid,.character-image-floating-grid,.character-color-presets,.character-image-presets')){closeFloatingPresetGrids();document.querySelectorAll('.character-color-presets[open],.character-image-presets[open]').forEach(x=>x.open=false)}});
window.addEventListener('resize',closeFloatingPresetGrids);
window.addEventListener('scroll',e=>{
  const target=e.target;
  if(target instanceof Element&&target.closest('.character-color-floating-grid,.character-image-floating-grid'))return;
  closeFloatingPresetGrids();
},true);

async function api(url, options={}) {
  const res = await fetch(url, {cache:'no-store', headers:{'Content-Type':'application/json', ...(options.headers||{})}, ...options});
  let data={}; try{data=await res.json()}catch{}
  if(!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
  return data;
}
function showStatus(msg, error=false){ const el=$('#status'); el.textContent=msg; el.classList.toggle('error',error); el.classList.remove('hidden'); clearTimeout(showStatus.t); showStatus.t=setTimeout(()=>el.classList.add('hidden'),4500); }
function openModal(html){ $('#modal').innerHTML=html; enhanceColorInputs($('#modal')); enhanceImageUrlInputs($('#modal')); $('#modalBackdrop').classList.remove('hidden'); }
function closeModal(){ closeFloatingPresetGrids(); $('#modalBackdrop').classList.add('hidden'); $('#modal').innerHTML=''; }
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
  let html='<button class="tree-cat-title" data-root>Duels Wiki</button>';
  for(const c of sortedCategories(state.index.categories)){ html+=`<div class="tree-cat"><button class="tree-cat-title" data-cat="${escapeHtml(c.slug)}">${escapeHtml(c.name)}</button>`; for(const d of c.documents||[]) html+=`<button class="tree-doc" data-cat="${escapeHtml(c.slug)}" data-doc="${escapeHtml(d.slug)}">${escapeHtml(d.title)}</button>`; html+='</div>'; }
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
function normalizeContent(content){ if(content?.type==='wiki-sections-v3'){const c=structuredClone(content);c.footnotes=Array.isArray(c.footnotes)?c.footnotes.map((f,i)=>({id:f?.id||uid('fn'),contentHtml:typeof f?.contentHtml==='string'?f.contentHtml:(typeof f?.text==='string'?`<p>${escapeHtml(f.text)}</p>`:'<p></p>')})):[];return c;} if(content?.type==='wiki-sections'){ const conv=s=>({id:s.id||uid('sec'),title:s.title||'제목 없음',contentHtml:oldNodeToHtml(s.content||{type:'doc'}),children:(s.children||[]).map(conv)}); return {type:'wiki-sections-v3',introHtml:oldNodeToHtml(content.intro||{type:'doc'}),sections:(content.sections||[]).map(conv),footnotes:[]}; }
  return {type:'wiki-sections-v3',introHtml:oldNodeToHtml(content||{type:'doc'}),sections:[{id:uid('sec'),title:'개요',contentHtml:'<p></p>',children:[]}],footnotes:[]}; }
function mediaSrc(src){ if(!src)return''; if(src.startsWith('/media/'))return'/__media__/'+encodeURIComponent(src.slice(1)); return src; }
function expandInlineImageSyntax(root){
  const re=/`((?:https?:\/\/|\/media\/|\/__media__\/)[^`\s]+?\.(?:png|jpe?g|webp|gif|svg)(?:\?[^`\s]*)?)`/gi;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
    const p=node.parentElement;if(!p)return NodeFilter.FILTER_REJECT;
    if(p.closest('code,pre,script,style,textarea'))return NodeFilter.FILTER_REJECT;
    return re.test(node.nodeValue||'')?(re.lastIndex=0,NodeFilter.FILTER_ACCEPT):(re.lastIndex=0,NodeFilter.FILTER_REJECT);
  }});
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(node=>{
    const text=node.nodeValue||'';let last=0,m;re.lastIndex=0;const frag=document.createDocumentFragment();
    while((m=re.exec(text))){if(m.index>last)frag.append(document.createTextNode(text.slice(last,m.index)));const img=document.createElement('img');img.className='inline-linked-image';img.src=mediaSrc(m[1]);img.alt='';img.loading='lazy';img.decoding='async';frag.append(img);last=m.index+m[0].length;}
    if(last<text.length)frag.append(document.createTextNode(text.slice(last)));node.replaceWith(frag);
  });
}

const DUELS_REF_COMMAND_RE=/\{\{=\s*duels\s*\(\s*(["'])(.*?)\1\s*,\s*(["'])(.*?)\3\s*\)\s*\}\}/gi;
const DUELS_FIELD_ALIASES={
  '이름':['name','displayname','charactername','charname','title','이름'],'name':['name','displayname','charactername','charname','title','이름'],
  '이미지':['image','img','imageurl','portrait','portraiturl','icon','iconurl','sprite','profile','thumbnail'],'image':['image','img','imageurl','portrait','portraiturl','icon','iconurl','sprite','profile','thumbnail'],
  '체력':['hp','maxhp','health','maxhealth','체력'],'hp':['hp','maxhp','health','maxhealth','체력'],
  '스태미나':['stamina','maxstamina','energy','maxenergy','스태미나'],'stamina':['stamina','maxstamina','energy','maxenergy','스태미나'],
  '이동속도':['speed','movespeed','movementspeed','walkspeed','이동속도'],'속도':['speed','movespeed','movementspeed','walkspeed','이동속도'],'speed':['speed','movespeed','movementspeed','walkspeed','이동속도'],
  '난이도':['difficulty','difficultyvalue','난이도'],'difficulty':['difficulty','difficultyvalue','난이도'],
  '공격력':['attack','atk','power','공격력'],'attack':['attack','atk','power','공격력'],
  '방어력':['defense','def','armor','방어력'],'defense':['defense','def','armor','방어력'],
  '캐릭터타입':['charactertype','character_type','type','combatstyle','style','타입','캐릭터타입'],
  '교전사거리':['engagementrange','engagement_range','combatrange','combat_range','rangeclass','거리','교전사거리'],
  '역할군':['role','class','archetype','roleclass','역할','역할군']
};
const DUELS_NARRATIVE_FIELDS=new Set(['description','desc','summary','lore','background','story','flavor','설명','배경','배경설정','스토리','소개'].map(duelsNormKey));
const DUELS_ROLE_RANGES=['초근거리','근거리','중근거리','중거리','중원거리','원거리','초원거리'];
const DUELS_ROLE_SOURCE=['classification','classify','characterclass','character_class','roletext','type','class','role','style','position','분류','역할','타입'];
const DUELS_SKILL_FIELD_ALIASES={
  '이름':['name','displayname','skillname','title','이름'],'name':['name','displayname','skillname','title','이름'],
  '피해':['damage','dmg','basedamage','damagevalue','피해','데미지'],'데미지':['damage','dmg','basedamage','damagevalue','피해','데미지'],'damage':['damage','dmg','basedamage','damagevalue','피해','데미지'],
  '쿨다운':['cooldown','cd','cooldowntime','쿨다운'],'cooldown':['cooldown','cd','cooldowntime','쿨다운'],
  '사거리':['range','attackrange','skillrange','사거리'],'range':['range','attackrange','skillrange','사거리'],
  '지속시간':['duration','time','지속시간'],'duration':['duration','time','지속시간'],
  '비용':['cost','staminacost','energycost','비용'],'cost':['cost','staminacost','energycost','비용']
};
function duelsNormKey(v){return String(v??'').toLowerCase().replace(/[^0-9a-z가-힣]+/g,'')}
function duelsMapValue(map,key,aliases={}){const keys=new Map(Object.keys(map||{}).map(k=>[duelsNormKey(k),k]));const wanted=[key,...(aliases[key]||aliases[duelsNormKey(key)]||[])];for(const w of wanted){const k=keys.get(duelsNormKey(w));if(k!==undefined)return map[k]}return undefined}
function findDuelsCharacter(name){const key=duelsNormKey(name);return (state.duelsData?.characters||[]).find(x=>[x.name,x.id].some(v=>duelsNormKey(v)===key))||null}
function duelsRoleParts(fields){
  const out={};let source='';
  for(const label of ['캐릭터타입','교전사거리','역할군']){const v=duelsMapValue(fields,label,DUELS_FIELD_ALIASES);if(v===undefined||v===null||v==='')continue;if(typeof v==='string'){const text=v.trim(),combined=DUELS_ROLE_RANGES.some(r=>text.includes(r))&&/[\s/·]/.test(text);if(combined||(label==='캐릭터타입'&&text.split(/\s+/).length>1)){source=source||text;continue}}out[label]=v}
  if(Object.keys(out).length===3)return out;if(!source){for(const key of DUELS_ROLE_SOURCE){const v=duelsMapValue(fields,key);if(typeof v==='string'&&v.trim().length>=2&&v.trim().length<=80){source=v.trim();break}}}
  if(!source)return out;const tokens=source.replace(/[\s/·,|>]+/g,' ').trim().split(' ').filter(Boolean);
  if(!out['교전사거리'])out['교전사거리']=DUELS_ROLE_RANGES.find(x=>source.includes(x))||'';
  if(!out['캐릭터타입'])out['캐릭터타입']=tokens.find(x=>x.endsWith('형')&&!DUELS_ROLE_RANGES.includes(x))||'';
  if(!out['역할군'])out['역할군']=[...tokens].reverse().find(x=>x!==out['캐릭터타입']&&x!==out['교전사거리']&&!DUELS_ROLE_RANGES.includes(x))||'';
  return out;
}
function resolveDuelsReferenceClient(character,field){
  const row=findDuelsCharacter(character);if(!row)return{ok:false,error:`캐릭터를 찾을 수 없음: ${character}`};const path=String(field||'').trim(),nk=duelsNormKey(path);
  if(['필드','필드목록','fields'].includes(nk))return{ok:true,kind:'text',value:Object.keys(row.fields||{}).filter(k=>!DUELS_NARRATIVE_FIELDS.has(duelsNormKey(k))).join(', ')};
  if(['스킬목록','skills','skilllist'].includes(nk)){const names=(row.skills||[]).map((sk,i)=>duelsMapValue(sk,'이름',DUELS_SKILL_FIELD_ALIASES)??`스킬 ${i+1}`);return{ok:true,kind:'text',value:names.join(', ')}}
  const sm=path.match(/^(?:스킬|skill)\s*\.?\s*(\d+)(?:\.(.+))?$/i);if(sm){const i=Number(sm[1])-1,sk=(row.skills||[])[i];if(!sk)return{ok:false,error:`스킬 ${i+1}을 찾을 수 없음`};const sub=(sm[2]||'이름').trim();if(DUELS_NARRATIVE_FIELDS.has(duelsNormKey(sub)))return{ok:false,error:'문장형 스킬 설명은 참조 대상이 아닙니다.'};const v=duelsMapValue(sk,sub,DUELS_SKILL_FIELD_ALIASES);return v===undefined||v===null?{ok:false,error:`스킬 ${i+1} 필드를 찾을 수 없음: ${sub}`}:{ok:true,kind:'text',value:v}}
  if(DUELS_NARRATIVE_FIELDS.has(nk))return{ok:false,error:'문장형 설명 필드는 참조 대상이 아닙니다.'};
  if(['캐릭터타입','교전사거리','역할군'].some(x=>duelsNormKey(x)===nk)){const parts=duelsRoleParts(row.fields||{});const key=['캐릭터타입','교전사거리','역할군'].find(x=>duelsNormKey(x)===nk);return parts[key]?{ok:true,kind:'text',value:parts[key]}:{ok:false,error:`${key} 정보를 찾을 수 없음: ${character}`}}
  if(['이름','name'].includes(nk))return{ok:true,kind:'text',value:row.name||''};
  if(['이미지','image','img','portrait'].includes(nk))return row.image?{ok:true,kind:'image',value:row.image}:{ok:false,error:`이미지를 찾을 수 없음: ${character}`};
  const v=duelsMapValue(row.fields||{},path,DUELS_FIELD_ALIASES);return v===undefined||v===null?{ok:false,error:`필드를 찾을 수 없음: ${field}`}:{ok:true,kind:'text',value:v};
}
function duelsRefMatchParts(m){return [m[2],m[4]]}
function expandDuelsReferenceSyntax(root){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){const p=node.parentElement;if(!p||p.closest('code,pre,script,style,textarea'))return NodeFilter.FILTER_REJECT;DUELS_REF_COMMAND_RE.lastIndex=0;return DUELS_REF_COMMAND_RE.test(node.nodeValue||'')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}});
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(node=>{const text=node.nodeValue||'';let last=0,m;DUELS_REF_COMMAND_RE.lastIndex=0;const frag=document.createDocumentFragment();while((m=DUELS_REF_COMMAND_RE.exec(text))){if(m.index>last)frag.append(document.createTextNode(text.slice(last,m.index)));const [character,field]=duelsRefMatchParts(m),result=resolveDuelsReferenceClient(character,field);if(result.ok&&result.kind==='image'){const img=document.createElement('img');img.className='inline-linked-image duels-ref-image';img.src=String(result.value||'');img.alt=character;img.loading='lazy';img.decoding='async';frag.append(img)}else if(result.ok){const span=document.createElement('span');span.className='duels-ref-value';span.dataset.duelsRef=`${character}:${field}`;span.textContent=typeof result.value==='object'?JSON.stringify(result.value):String(result.value??'');frag.append(span)}else{const span=document.createElement('span');span.className='duels-ref-error';span.textContent='[참조 오류]';span.dataset.duelsRefError=result.error||'참조 실패';frag.append(span)}last=m.index+m[0].length}if(last<text.length)frag.append(document.createTextNode(text.slice(last)));node.replaceWith(frag)});
}
async function ensureDuelsData(force=false){
  if(state.duelsData&&!force)return state.duelsData;
  try{state.duelsData=await api(`/api/duels-data${force?'?refresh=1':''}`);state.duelsDataError='';return state.duelsData}catch(e){state.duelsData=state.duelsData||{characters:[]};state.duelsDataError=e.message||String(e);return state.duelsData}
}
function duelsRefCommand(character,field){return `{{=duels(${JSON.stringify(String(character||''))},${JSON.stringify(String(field||''))})}}`}
function insertPlainTextAtSavedRange(text){
  const r=state.savedRange?.cloneRange();if(!r)return false;const el=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement;const editable=el?.closest?.('.editable,[data-footnote-target="1"],.inline-title-editable');if(!editable||!$('#editPage')?.contains(editable))return false;
  r.deleteContents();const n=document.createTextNode(text);r.insertNode(n);r.setStartAfter(n);r.collapse(true);const sel=getSelection();sel.removeAllRanges();sel.addRange(r);state.savedRange=r.cloneRange();editable.dispatchEvent(new Event('input',{bubbles:true}));return true;
}
function duelsReferenceCharacters(){
  const rows=state.duelsData?.characters||[];
  const profileKeys=new Set(DUELS_CHARACTER_PROFILES.flatMap(p=>[duelsNormKey(p.id),duelsNormKey(p.name)]));
  const matched=rows.filter(row=>profileKeys.has(duelsNormKey(row.id))||profileKeys.has(duelsNormKey(row.name)));
  const source=matched.length?matched:rows.filter(row=>row&&String(row.name||row.id||'').trim()&&!['체력','스태미나','이동속도','난이도','공격력','방어력','스킬','가져올값'].includes(duelsNormKey(row.name||row.id)));
  return [...source].sort((a,b)=>String(a.name||a.id||'').localeCompare(String(b.name||b.id||''),'ko'));
}
function duelsReferenceFields(row){
  const out=[];const seen=new Set();
  const add=(value,label=value,group='기본')=>{value=String(value||'').trim();if(!value||seen.has(value))return;seen.add(value);out.push({value,label:String(label||value),group})};
  ['이름','이미지','체력','스태미나','이동속도','난이도','공격력','방어력','캐릭터타입','교전사거리','역할군'].forEach(x=>add(x,x,'기본'));
  Object.keys(row?.fields||{}).filter(k=>!DUELS_NARRATIVE_FIELDS.has(duelsNormKey(k))).forEach(k=>add(k,k,'원본 능력치'));
  (row?.skills||[]).forEach((sk,i)=>{
    const n=i+1;add(`스킬.${n}.이름`,`스킬 ${n} · 이름`,'스킬');
    Object.keys(sk||{}).filter(k=>!DUELS_NARRATIVE_FIELDS.has(duelsNormKey(k))).forEach(k=>add(`스킬.${n}.${k}`,`스킬 ${n} · ${k}`,'스킬'));
  });
  return out;
}
async function openDuelsReferenceDialog(){
  rememberSelection();await ensureDuelsData();const chars=duelsReferenceCharacters();
  openModal(`<div class="duels-ref-modal"><h2>듀얼즈 참조</h2><p class="muted">Wiki에 값 자체를 저장하지 않고 Duels.html의 최신 캐릭터 데이터를 참조합니다.</p>${state.duelsDataError?`<div class="duels-ref-warning">${escapeHtml(state.duelsDataError)}</div>`:''}${chars.length?'':`<div class="duels-ref-warning">원본에서 캐릭터 데이터를 찾지 못했습니다. 원본 새로고침을 시도하세요.</div>`}<div class="form-row"><label>캐릭터</label><select id="duelsRefCharacter">${chars.map(x=>`<option value="${escapeHtml(x.name||x.id)}">${escapeHtml(x.name||x.id)}${x.id&&x.id!==x.name?` · ${escapeHtml(x.id)}`:''}</option>`).join('')}</select></div><div class="form-row"><label>가져올 값</label><select id="duelsRefField"></select></div><div class="duels-ref-preview"><span>명령어</span><code id="duelsRefPreview"></code></div><div class="modal-actions"><button id="duelsRefRefresh">원본 새로고침</button><button id="duelsRefCancel">취소</button><button id="duelsRefInsert" class="primary">삽입</button></div></div>`);
  const sel=$('#duelsRefCharacter'),field=$('#duelsRefField'),preview=$('#duelsRefPreview');
  const redraw=()=>{const row=findDuelsCharacter(sel.value),items=duelsReferenceFields(row),groups=new Map();for(const item of items){if(!groups.has(item.group))groups.set(item.group,[]);groups.get(item.group).push(item)}field.innerHTML=[...groups].map(([g,xs])=>`<optgroup label="${escapeHtml(g)}">${xs.map(x=>`<option value="${escapeHtml(x.value)}">${escapeHtml(x.label)}</option>`).join('')}</optgroup>`).join('');if([...field.options].some(o=>o.value==='체력'))field.value='체력';preview.textContent=duelsRefCommand(sel.value,field.value)};
  sel.onchange=redraw;field.onchange=()=>preview.textContent=duelsRefCommand(sel.value,field.value);redraw();
  $('#duelsRefCancel').onclick=closeModal;
  $('#duelsRefRefresh').onclick=async()=>{const old=sel.value;await ensureDuelsData(true);closeModal();await openDuelsReferenceDialog();const next=$('#duelsRefCharacter');if(next&&[...next.options].some(o=>o.value===old)){next.value=old;next.dispatchEvent(new Event('change'))}};
  $('#duelsRefInsert').onclick=()=>{const cmd=duelsRefCommand(sel.value,field.value);closeModal();if(!insertPlainTextAtSavedRange(cmd)){showStatus('참조 명령을 삽입할 텍스트 위치를 먼저 선택하세요.',true)}};
}

function viewHtml(html,{expandInlineImages=true}={}){ const t=document.createElement('template'); t.innerHTML=html||''; $$('img',t.content).forEach(img=>{const src=img.getAttribute('src')||'';img.setAttribute('src',mediaSrc(src));}); $$('a',t.content).forEach(a=>{const h=a.getAttribute('href')||''; if(h.startsWith('wiki:/'))a.dataset.wikiLink=h;}); upgradeDuelsComponents(t.content); if(!state.editing)expandDuelsReferenceSyntax(t.content); if(expandInlineImages)expandInlineImageSyntax(t.content); return t.innerHTML; }
function footnoteAnchor(id){return 'footnote-'+String(id).replace(/[^a-zA-Z0-9_-]/g,'-')}
function footnoteNumber(content,id){const i=(content?.footnotes||[]).findIndex(f=>f.id===id);return i>=0?i+1:null}
function syncFootnoteRefs(root,content){
  $$('[data-footnote-ref]',root).forEach(a=>{const id=a.dataset.footnoteRef,n=footnoteNumber(content,id);if(n==null){a.classList.add('missing-footnote');a.textContent='[?]';a.removeAttribute('href');return}a.classList.remove('missing-footnote');a.textContent=`[${n}]`;a.setAttribute('href',`#${footnoteAnchor(id)}`);a.removeAttribute('title');});
}
function renderFootnotes(content,editable=false){
  const notes=content?.footnotes||[];if(!notes.length)return'';
  if(editable)return `<section class="footnotes-block footnotes-edit-block" data-footnotes-block><div class="footnotes-fixed-head"><span class="footnotes-kicker">NOTES</span><h2>각주</h2><span class="footnotes-lock">고정 블록</span></div><div class="footnotes-edit-list">${notes.map((f,i)=>`<div class="footnote-edit-row" id="${footnoteAnchor(f.id)}" data-footnote-id="${escapeHtml(f.id)}"><span class="footnote-number">[${i+1}]</span><div class="editable footnote-edit-body" contenteditable="true" data-footnote-editor="1">${viewHtml(f.contentHtml,{expandInlineImages:false})}</div><button type="button" class="footnote-delete-btn" data-footnote-delete="${escapeHtml(f.id)}" title="이 각주 삭제" aria-label="각주 ${i+1} 삭제">삭제</button></div>`).join('')}</div></section>`;
  return `<section class="footnotes-block" data-footnotes-block><div class="footnotes-fixed-head"><span class="footnotes-kicker">NOTES</span><h2>각주</h2></div><div class="footnotes-list">${notes.map((f,i)=>`<div class="footnote-row" id="${footnoteAnchor(f.id)}"><span class="footnote-number">[${i+1}]</span><div class="footnote-content wiki-body">${viewHtml(f.contentHtml)}</div></div>`).join('')}</div></section>`;
}
function removeFootnoteFromTablePayloads(id,root=$('#editPage')){if(!root)return;$$('[data-duels-component="table"]',root).forEach(el=>{const data=normalizeTableData(componentPayload(el));let changed=false;for(const row of data.cells||[])for(const cell of row||[]){if(!cell?.html)continue;const t=document.createElement('template');t.innerHTML=cell.html;$$(`[data-footnote-ref="${CSS.escape(id)}"]`,t.content).forEach(a=>{(a.closest('sup')||a).remove();changed=true});if(changed)cell.html=t.innerHTML}if(changed){renderTableElement(el,data);el.closest('.editable')?.dispatchEvent(new Event('input',{bubbles:true}))}})}
function deleteFootnote(id){
  const notes=editingContent?.footnotes||[],idx=notes.findIndex(f=>f.id===id);if(idx<0)return;
  const n=idx+1,refs=$$(`[data-footnote-ref="${CSS.escape(id)}"]`,$('#editPage')).length;
  const msg=refs?`각주 [${n}]을 삭제할까요?\n본문의 이 각주 참조 ${refs}개도 함께 제거됩니다.`:`각주 [${n}]을 삭제할까요?`;
  if(!confirm(msg))return;
  removeFootnoteFromTablePayloads(id);
  $$(`[data-footnote-ref="${CSS.escape(id)}"]`,$('#editPage')).forEach(a=>{
    const editable=a.closest('.editable'),sup=a.closest('sup');(sup||a).remove();editable?.dispatchEvent(new Event('input',{bubbles:true}));
  });
  notes.splice(idx,1);hideFootnotePopover();refreshFootnoteBlock();syncFootnoteRefs($('#editPage'),editingContent);
}
function bindFootnoteEditors(){
  $$('.footnote-edit-row',$('#editPage')).forEach(row=>{const f=(editingContent.footnotes||[]).find(x=>x.id===row.dataset.footnoteId),body=$('.footnote-edit-body',row);if(!f||!body)return;bindEditable(body);body.addEventListener('input',()=>f.contentHtml=storageHtml(body));});
  $$('[data-footnote-delete]',$('#editPage')).forEach(b=>b.onclick=()=>deleteFootnote(b.dataset.footnoteDelete));
  syncFootnoteRefs($('#editPage'),editingContent);
}
function refreshFootnoteBlock(){
  const host=$('#footnoteBlockHost');if(!host)return;host.innerHTML=renderFootnotes(editingContent,true);bindFootnoteEditors();
}
function storageHtml(el){ clearComponentCaretAnchors(el); const clone=el.cloneNode(true); $$('img',clone).forEach(img=>{let src=img.getAttribute('src')||''; if(src.startsWith('/__media__/')){src='/'+decodeURIComponent(src.slice('/__media__/'.length));img.setAttribute('src',src);} img.classList.remove('selected-image');}); $$('.selected-duels-component',clone).forEach(x=>x.classList.remove('selected-duels-component')); $$('.table-cell-selected,.table-cell-editing',clone).forEach(x=>x.classList.remove('table-cell-selected','table-cell-editing')); $$('[data-table-cell]',clone).forEach(x=>{x.removeAttribute('contenteditable');x.removeAttribute('data-table-cell-editing');x.removeAttribute('data-footnote-target')}); $$('[data-editor-only]',clone).forEach(x=>x.remove()); return clone.innerHTML.replace(/\u200B/g,''); }

function sectionAnchor(id){return 'section-'+String(id).replace(/[^a-zA-Z0-9_-]/g,'-')}
function renderToc(sections,prefix='',depth=0){return sections.map((s,i)=>{const n=prefix?`${prefix}.${i+1}`:`${i+1}`;return `<div class="toc-line" style="--toc-depth:${depth}"><a class="toc-number" href="#" data-section-anchor="${sectionAnchor(s.id)}">${n}.</a><span class="toc-text">${escapeHtml(s.title||'제목 없음')}</span></div>${renderToc(s.children||[],n,depth+1)}`}).join('')}
function displayTitleHtml(raw,fallback){return viewHtml(typeof raw==='string'&&raw.trim()?raw:escapeHtml(fallback||''),{expandInlineImages:false})}
function plainTitleFromEditable(el){if(!el)return'';const clone=el.cloneNode(true);$$('sup:has(a[data-footnote-ref])',clone).forEach(x=>x.remove());return (clone.textContent||'').replace(/\s+/g,' ').trim()}
function storageInlineHtml(el){if(!el)return'';const clone=el.cloneNode(true);$$('[data-editor-only]',clone).forEach(x=>x.remove());return clone.innerHTML.replace(/\u200B/g,'').replace(/<div><br><\/div>/gi,'').trim()}
function bindInlineFootnoteTarget(el,onInput){if(!el)return;el.dataset.footnoteTarget='1';el.addEventListener('focusin',()=>{state.lastEditable=el});el.addEventListener('mouseup',()=>{const sel=getSelection();if(sel?.rangeCount){const r=sel.getRangeAt(0),sup=footnoteSupFromNode(r.startContainer);if(sup&&caretIsAtFootnoteEnd(r,sup))placeCaretOutsideFootnote(el,sup)}rememberSelection()});el.addEventListener('keyup',e=>{if(['ArrowRight','End'].includes(e.key))normalizeFootnoteCaretForInput(el);rememberSelection()});el.addEventListener('compositionstart',()=>normalizeFootnoteCaretForInput(el));el.addEventListener('beforeinput',e=>{if(e.inputType?.startsWith('insert'))normalizeFootnoteCaretForInput(el);if(e.inputType==='insertParagraph'||e.inputType==='insertLineBreak')e.preventDefault()});el.addEventListener('keydown',e=>{if(e.key==='Enter')e.preventDefault()});el.addEventListener('input',()=>{onInput?.();rememberSelection()})}
function renderSections(sections,selfHash,prefix='',depth=1){return sections.map((s,i)=>{const n=prefix?`${prefix}.${i+1}`:`${i+1}`;return `<section class="section depth-${Math.min(depth,3)}"><h2 id="${sectionAnchor(s.id)}" class="section-title"><a class="number" href="${selfHash}">${n}.</a>${displayTitleHtml(s.titleHtml,s.title||'제목 없음')}</h2><div class="section-body wiki-body">${viewHtml(s.contentHtml)}</div>${renderSections(s.children||[],selfHash,n,depth+1)}</section>`}).join('')}
let footnotePopover=null, footnotePopoverAnchor=null, footnoteHideTimer=0, footnoteOutsideBound=false;
function isTouchFootnoteMode(){return !matchMedia('(hover:hover) and (pointer:fine)').matches}
function ensureFootnotePopover(){
  if(footnotePopover?.isConnected)return footnotePopover;
  const p=document.createElement('div');p.className='footnote-popover hidden';p.setAttribute('role','tooltip');p.innerHTML='<div class="footnote-popover-head"><span class="footnote-popover-label"></span><button type="button" class="footnote-popover-close" aria-label="닫기">×</button></div><div class="footnote-popover-body wiki-body"></div><button type="button" class="footnote-popover-jump">각주로 이동</button>';
  document.body.append(p);footnotePopover=p;
  p.addEventListener('mouseenter',()=>clearTimeout(footnoteHideTimer));
  p.addEventListener('mouseleave',()=>{if(!isTouchFootnoteMode())scheduleFootnotePopoverHide()});
  $('.footnote-popover-close',p).onclick=()=>hideFootnotePopover();
  $('.footnote-popover-jump',p).onclick=()=>{const a=footnotePopoverAnchor;if(a)jumpToFootnote(a)};
  return p;
}
function footnoteTargetFor(a){const h=a?.getAttribute('href')||'';return h.startsWith('#footnote-')?document.getElementById(h.slice(1)):null}
function jumpToFootnote(a){const target=footnoteTargetFor(a);hideFootnotePopover();target?.scrollIntoView({behavior:'smooth',block:'center'});}
function positionFootnotePopover(a){
  const p=ensureFootnotePopover();if(isTouchFootnoteMode()){p.style.left='12px';p.style.right='12px';p.style.top='auto';p.style.bottom='12px';return}
  p.style.right='auto';p.style.bottom='auto';const r=a.getBoundingClientRect();const w=Math.min(380,window.innerWidth-24);p.style.width=w+'px';let left=Math.min(Math.max(12,r.left),window.innerWidth-w-12);p.style.left=left+'px';p.style.top='0px';const ph=p.offsetHeight||150;let top=r.bottom+9;if(top+ph>window.innerHeight-12)top=Math.max(12,r.top-ph-9);p.style.top=top+'px';
}
function showFootnotePopover(a){
  const target=footnoteTargetFor(a);if(!target)return;clearTimeout(footnoteHideTimer);const p=ensureFootnotePopover();const body=$('.footnote-content,.footnote-edit-body',target);const n=(a.textContent||'').trim();$('.footnote-popover-label',p).textContent=n;$('.footnote-popover-body',p).innerHTML=body?.innerHTML||'<p>내용이 없습니다.</p>';footnotePopoverAnchor?.classList.remove('footnote-ref-active');footnotePopoverAnchor=a;a.classList.add('footnote-ref-active');p.classList.remove('hidden');positionFootnotePopover(a);
}
function hideFootnotePopover(){clearTimeout(footnoteHideTimer);if(footnotePopover)footnotePopover.classList.add('hidden');footnotePopoverAnchor?.classList.remove('footnote-ref-active');footnotePopoverAnchor=null}
function scheduleFootnotePopoverHide(){clearTimeout(footnoteHideTimer);footnoteHideTimer=setTimeout(()=>hideFootnotePopover(),130)}
function bindFootnotePreview(root){
  $$('a[data-footnote-ref]',root).forEach(a=>{
    a.addEventListener('mouseenter',()=>{if(!isTouchFootnoteMode())showFootnotePopover(a)});
    a.addEventListener('mouseleave',()=>{if(!isTouchFootnoteMode())scheduleFootnotePopoverHide()});
    a.addEventListener('click',e=>{const h=a.getAttribute('href')||'';if(!h.startsWith('#footnote-'))return;e.preventDefault();if(isTouchFootnoteMode()){if(footnotePopoverAnchor===a&&footnotePopover&&!footnotePopover.classList.contains('hidden'))jumpToFootnote(a);else showFootnotePopover(a);return}jumpToFootnote(a);});
  });
  if(!footnoteOutsideBound){document.addEventListener('click',e=>{if(!isTouchFootnoteMode()||!footnotePopoverAnchor)return;if(e.target.closest('.footnote-popover')||e.target.closest('a[data-footnote-ref]'))return;hideFootnotePopover()},{capture:true});footnoteOutsideBound=true;}
}
function bindWikiLinks(root){ bindFootnotePreview(root); $$('a[data-wiki-link]',root).forEach(a=>a.addEventListener('click',e=>{e.preventDefault(); const x=a.dataset.wikiLink.slice(6); if(!x||x==='/'){location.hash='#/';return} const p=x.replace(/^\//,'').split('/').map(decodeURIComponent); navigate(p[0],p[1]||null);})); $$('[data-section-anchor]',root).forEach(a=>a.addEventListener('click',e=>{e.preventDefault();document.getElementById(a.dataset.sectionAnchor)?.scrollIntoView({behavior:'smooth',block:'start'});})); }

async function renderRoute(){ state.editing=false; hideToolbar(); state.selectedImage=null; updateOverlay(); const route=parseRoute(); if(!route){await renderHome();return} await ensureDuelsData(); try{const r=await api(`/api/document?category=${encodeURIComponent(route.category)}${route.doc?`&doc=${encodeURIComponent(route.doc)}`:''}`); state.current=r.document; state.currentPath=r.path; renderDocument(r.document,route);}catch(e){$('#viewPage').innerHTML=`<div class="wiki-card"><h2>문서를 불러올 수 없습니다.</h2><p>${escapeHtml(e.message)}</p></div>`;} }
async function renderHome(){ await ensureDuelsData(); try{const r=await api('/api/root'); state.current=r.document; state.currentPath=r.path; renderRootDocument(r.document);}catch(e){state.current=null;state.currentPath='';$('#viewPage').innerHTML=`<div class="wiki-card"><h2>Duels Wiki</h2><p>${escapeHtml(e.message)}</p></div>`;$('#editPage').classList.add('hidden');$('#viewPage').classList.remove('hidden');} }
function renderRootDocument(doc){ const c=normalizeContent(doc.content); const self='#/'; $('#viewPage').innerHTML=`<div class="wiki-card"><div class="doc-head"><div><h1>${displayTitleHtml(c.titleHtml,doc.title||'Duels Wiki')}</h1></div><div class="doc-actions"><button id="editBtn">문서 편집</button><button id="historyBtn">문서 역사</button></div></div><div class="intro wiki-body">${viewHtml(c.introHtml)}</div>${c.sections.length?`<nav class="toc"><div class="toc-title">목차</div>${renderToc(c.sections)}</nav>`:''}${renderSections(c.sections,self)}${renderFootnotes(c)}</div>`; $('#editPage').classList.add('hidden');$('#viewPage').classList.remove('hidden');syncFootnoteRefs($('#viewPage'),c);bindWikiLinks($('#viewPage'));$('#editBtn').onclick=()=>startRootEdit(doc);$('#historyBtn').onclick=()=>showHistory(); }
function renderDocument(doc,route){ const c=normalizeContent(doc.content); const self=routeFor(route.category,route.doc); const canDuplicate=doc.kind==='document'; $('#viewPage').innerHTML=`<div class="wiki-card"><div class="doc-head"><div><h1>${displayTitleHtml(c.titleHtml,doc.title)}</h1></div><div class="doc-actions">${canDuplicate?'<button id="duplicateBtn">문서 복제</button>':''}<button id="editBtn">문서 편집</button><button id="historyBtn">문서 역사</button></div></div><div class="intro wiki-body">${viewHtml(c.introHtml)}</div>${c.sections.length?`<nav class="toc"><div class="toc-title">목차</div>${renderToc(c.sections)}</nav>`:''}${renderSections(c.sections,self)}${renderFootnotes(c)}</div>`; $('#editPage').classList.add('hidden');$('#viewPage').classList.remove('hidden');syncFootnoteRefs($('#viewPage'),c);bindWikiLinks($('#viewPage'));if(canDuplicate)$('#duplicateBtn').onclick=()=>duplicateDocumentModal(doc,route);$('#editBtn').onclick=()=>startEdit(doc,route);$('#historyBtn').onclick=()=>showHistory(); }
function duplicateDocumentModal(doc,route){
  const cats=sortedCategories(state.index?.categories||[]);
  const suggested=`${doc.title} 복사본`;
  openModal(`<div class="duplicate-doc-modal"><div class="duplicate-doc-icon">⧉</div><h2>문서 복제</h2><p class="muted duplicate-doc-help">현재 문서의 내용과 구성요소를 그대로 복사해 새 문서를 만듭니다. 원본 문서는 변경되지 않습니다.</p><div class="form-row"><label>복제할 카테고리</label><select id="duplicateDocCat">${cats.map(c=>`<option value="${escapeHtml(c.slug)}" ${c.slug===route.category?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select></div><div class="form-row"><label>새 문서명</label><input id="duplicateDocTitle" value="${escapeHtml(suggested)}" autocomplete="off"></div><div class="modal-actions"><button id="cancelDuplicateDoc">취소</button><button id="confirmDuplicateDoc" class="primary">복제</button></div></div>`);
  const title=$('#duplicateDocTitle');title.focus();title.select();
  $('#cancelDuplicateDoc').onclick=closeModal;
  const submit=async()=>{const button=$('#confirmDuplicateDoc');try{const nextCategory=$('#duplicateDocCat').value,newTitle=title.value.trim();if(!newTitle){title.focus();return}button.disabled=true;button.textContent='복제 중…';const r=await api('/api/document/duplicate',{method:'POST',body:JSON.stringify({category:route.category,doc:route.doc,nextCategory,title:newTitle})});closeModal();await refreshIndex();showStatus(`“${newTitle}” 문서를 복제했습니다.`);navigate(nextCategory,r.document.slug)}catch(e){button.disabled=false;button.textContent='복제';alert(e.message)}};
  $('#confirmDuplicateDoc').onclick=submit;title.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();submit()}};
}

function createSectionEditor(section,parentArray,prefix,depth){ const wrap=document.createElement('div');wrap.className='section-edit';wrap.dataset.sectionId=section.id; const idx=parentArray.indexOf(section); const number=prefix?`${prefix}.${idx+1}`:`${idx+1}`; wrap.innerHTML=`<div class="section-edit-head"><span class="section-number">${number}.</span><div class="section-title-input inline-title-editable" contenteditable="true"></div></div><div class="editable section-edit-body" contenteditable="true"></div><div class="children"></div><div class="section-controls"><button data-child>＋ 하위</button><button data-next>＋ 다음</button><button data-delete class="danger">삭제</button></div>`; const title=$('.section-title-input',wrap);title.innerHTML=displayTitleHtml(section.titleHtml,section.title||'제목 없음');bindInlineFootnoteTarget(title,()=>{section.titleHtml=storageInlineHtml(title);section.title=plainTitleFromEditable(title)||'제목 없음'});const body=$('.section-edit-body',wrap);body.innerHTML=viewHtml(section.contentHtml,{expandInlineImages:false}); body.addEventListener('input',()=>section.contentHtml=storageHtml(body)); bindEditable(body);
  $('[data-child]',wrap).onclick=()=>{section.children.push({id:uid('sec'),title:'새 목차',contentHtml:'<p></p>',children:[]});renderSectionTree()}; $('[data-next]',wrap).onclick=()=>{parentArray.splice(parentArray.indexOf(section)+1,0,{id:uid('sec'),title:'새 목차',contentHtml:'<p></p>',children:[]});renderSectionTree()}; $('[data-delete]',wrap).onclick=()=>{if(confirm('이 목차 블록과 하위 블록을 삭제할까요?')){parentArray.splice(parentArray.indexOf(section),1);renderSectionTree()}}; return wrap; }
let editingContent=null;
function appendSections(container,sections,prefix='',depth=1){sections.forEach(s=>{const node=createSectionEditor(s,sections,prefix,depth);container.appendChild(node);const child=$('.children',node);appendSections(child,s.children||[],prefix?`${prefix}.${sections.indexOf(s)+1}`:`${sections.indexOf(s)+1}`,depth+1)});}
function renderSectionTree(){ const root=$('#sectionTree'); if(!root)return; root.innerHTML='';appendSections(root,editingContent.sections); }
function startRootEdit(doc){ state.editing=true; editingContent=normalizeContent(doc.content); $('#viewPage').classList.add('hidden');$('#editPage').classList.remove('hidden');$('#editPage').innerHTML=`<div class="editor-card"><div class="title-block"><div id="docTitle" class="title-block-title inline-title-editable" contenteditable="true"></div><div id="introEditor" class="editable rich" contenteditable="true"></div></div><div id="sectionTree"></div><div id="footnoteBlockHost"></div><div class="savebar root-savebar"><span class="muted">루트 문서는 삭제할 수 없습니다.</span><button id="saveBtn" class="primary">문서 저장</button></div></div>`;const title=$('#docTitle');title.innerHTML=displayTitleHtml(editingContent.titleHtml,doc.title||'Duels Wiki');bindInlineFootnoteTarget(title,()=>editingContent.titleHtml=storageInlineHtml(title)); const intro=$('#introEditor'); intro.innerHTML=viewHtml(editingContent.introHtml,{expandInlineImages:false});bindEditable(intro);intro.addEventListener('input',()=>editingContent.introHtml=storageHtml(intro));renderSectionTree();refreshFootnoteBlock();showToolbar();$('#saveBtn').onclick=saveRootCurrent; }
async function saveRootCurrent(){ try{ editingContent.introHtml=storageHtml($('#introEditor')); $$('.section-edit').forEach(n=>{const s=findSection(editingContent.sections,n.dataset.sectionId);if(s){s.contentHtml=storageHtml($('.section-edit-body',n));const t=$('.section-title-input',n);if(t){s.titleHtml=storageInlineHtml(t);s.title=plainTitleFromEditable(t)||'제목 없음'}}}); $$('.footnote-edit-row').forEach(n=>{const f=(editingContent.footnotes||[]).find(x=>x.id===n.dataset.footnoteId);if(f)f.contentHtml=storageHtml($('.footnote-edit-body',n));}); editingContent.titleHtml=storageInlineHtml($('#docTitle'));const rootTitle=plainTitleFromEditable($('#docTitle'))||'Duels Wiki'; await api('/api/root/update',{method:'POST',body:JSON.stringify({title:rootTitle,content:editingContent})}); showStatus('Duels Wiki 문서를 저장했습니다. GitHub Pages는 Actions 완료 후 갱신됩니다.'); location.hash='#/'; await renderRoute(); }catch(e){showStatus(e.message,true)} }

function startEdit(doc,route){ state.editing=true; editingContent=normalizeContent(doc.content); const cats=state.index.categories; const isInfo=doc.kind==='category-info'; $('#viewPage').classList.add('hidden');$('#editPage').classList.remove('hidden');$('#editPage').innerHTML=`<div class="editor-card"><div class="edit-meta"><select id="categorySelect" ${isInfo?'disabled':''}>${cats.map(c=>`<option value="${escapeHtml(c.slug)}" ${c.slug===route.category?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select></div><div class="title-block"><div id="docTitle" class="title-block-title inline-title-editable ${isInfo?'disabled-title':''}" contenteditable="${isInfo?'false':'true'}"></div><div id="introEditor" class="editable rich" contenteditable="true"></div></div><div id="sectionTree"></div><div id="footnoteBlockHost"></div><div class="savebar"><button id="deleteBtn" class="danger">${isInfo?'카테고리 삭제':'문서 삭제'}</button><button id="saveBtn" class="primary">문서 저장</button></div></div>`;const title=$('#docTitle');title.innerHTML=displayTitleHtml(editingContent.titleHtml,doc.title);if(!isInfo)bindInlineFootnoteTarget(title,()=>editingContent.titleHtml=storageInlineHtml(title)); const intro=$('#introEditor'); intro.innerHTML=viewHtml(editingContent.introHtml,{expandInlineImages:false});bindEditable(intro);intro.addEventListener('input',()=>editingContent.introHtml=storageHtml(intro));renderSectionTree();refreshFootnoteBlock();showToolbar();$('#saveBtn').onclick=()=>saveCurrent(route,isInfo);$('#deleteBtn').onclick=()=>deleteCurrent(route,isInfo); }
async function saveCurrent(route,isInfo){ try{ editingContent.introHtml=storageHtml($('#introEditor'));if(!isInfo)editingContent.titleHtml=storageInlineHtml($('#docTitle')); $$('.section-edit').forEach(n=>{const s=findSection(editingContent.sections,n.dataset.sectionId);if(s){s.contentHtml=storageHtml($('.section-edit-body',n));const t=$('.section-title-input',n);if(t){s.titleHtml=storageInlineHtml(t);s.title=plainTitleFromEditable(t)||'제목 없음'}}}); $$('.footnote-edit-row').forEach(n=>{const f=(editingContent.footnotes||[]).find(x=>x.id===n.dataset.footnoteId);if(f)f.contentHtml=storageHtml($('.footnote-edit-body',n));});const nextTitle=isInfo?state.current?.title:(plainTitleFromEditable($('#docTitle'))||state.current?.title||'제목 없음'); await api('/api/document/update',{method:'POST',body:JSON.stringify({category:route.category,doc:route.doc,title:nextTitle,nextCategory:$('#categorySelect').value,content:editingContent})}); showStatus('저장했습니다. GitHub Pages는 Actions 완료 후 갱신됩니다.'); await refreshIndex(); const nextCat=isInfo?route.category:$('#categorySelect').value;const nextDoc=isInfo?null:safeSlugClient(nextTitle); navigate(nextCat,nextDoc); }catch(e){showStatus(e.message,true)} }
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
$('.appbar').addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();},{passive:false});

function protectedEditorElement(node){
  if(!node)return null;
  const el=node.nodeType===1?node:node.parentElement;
  return el?.closest?.('img,[data-duels-component]')||null;
}
function isEmptyEditorParagraph(p){
  if(!p||p.tagName!=='P')return false;
  if(p.querySelector('img,[data-duels-component]'))return false;
  return !String(p.textContent||'').replace(/\u200b/g,'').trim() && !p.querySelector('br:not(:only-child)');
}
function clearComponentCaretAnchors(root=document){
  $$('[data-component-caret-anchor]',root).forEach(x=>x.remove());
}
function placeCaretInNode(node,atEnd=true){
  const sel=getSelection(),r=document.createRange();
  r.selectNodeContents(node);r.collapse(!atEnd);sel.removeAllRanges();sel.addRange(r);state.savedRange=r.cloneRange();
}
function placeCaretAfterElement(editable,element){
  if(!editable||!element||!editable.contains(element))return false;
  clearComponentCaretAnchors(editable);
  const r=document.createRange();r.setStartAfter(element);r.collapse(true);
  const sel=getSelection();sel.removeAllRanges();sel.addRange(r);state.savedRange=r.cloneRange();return true;
}
function placeComponentSideCaret(editable,element){
  // 3.30: 요소 자체와 같은 높이의 빈 여백은 동일한 입력 지점으로 취급한다.
  // 저장되지 않는 편집 전용 caret을 요소의 오른쪽 아래에 띄우고, 실제 입력이 시작될 때만 아래 문단으로 개행한다.
  if(!editable||!element||!editable.contains(element))return false;
  clearComponentCaretAnchors(editable);
  const er=editable.getBoundingClientRect(),rr=element.getBoundingClientRect();
  const anchor=document.createElement('span');
  anchor.dataset.componentCaretAnchor='1';
  anchor.dataset.editorOnly='1';
  anchor.setAttribute('contenteditable','true');
  anchor.textContent='\u200b';
  const x=Math.max(2,Math.min(editable.clientWidth-4,rr.right-er.left+4));
  const y=Math.max(0,rr.bottom-er.top-20);
  anchor.style.left=`${x}px`;
  anchor.style.top=`${y}px`;
  element.insertAdjacentElement('afterend',anchor);
  requestAnimationFrame(()=>placeCaretInNode(anchor,true));
  return true;
}
function paragraphAfterElement(editable,element,text=''){
  clearComponentCaretAnchors(editable);
  const p=document.createElement('p');
  if(text){p.textContent=text}else{p.appendChild(document.createElement('br'))}
  element.insertAdjacentElement('afterend',p);
  placeCaretInNode(p,true);
  editable.dispatchEvent(new Event('input',{bubbles:true}));
  return p;
}
function selectionTouchesProtectedElement(range){
  if(!range)return false;
  const root=range.commonAncestorContainer.nodeType===1?range.commonAncestorContainer:range.commonAncestorContainer.parentElement;
  if(protectedEditorElement(root))return true;
  const editable=root?.closest?.('.editable');
  if(!editable)return false;
  return $$('img,[data-duels-component]',editable).some(x=>{try{return range.intersectsNode(x)}catch{return false}});
}
function adjacentProtectedElement(range,key){
  if(!range?.collapsed)return null;
  let node=range.startContainer,offset=range.startOffset;
  if(node.nodeType===3){
    if(key==='Backspace'&&offset>0)return null;
    if(key==='Delete'&&offset<node.data.length)return null;
    const parent=node.parentNode,idx=[...parent.childNodes].indexOf(node);
    node=parent;offset=key==='Backspace'?idx:idx+1;
  }
  if(node.nodeType!==1)return null;
  const children=node.childNodes;
  const candidate=key==='Backspace'?children[offset-1]:children[offset];
  return protectedEditorElement(candidate);
}
function caretAtParagraphBoundary(range,p,side){
  if(!range?.collapsed||!p)return false;
  try{
    const r=document.createRange();r.selectNodeContents(p);
    if(side==='start')r.setEnd(range.startContainer,range.startOffset);else r.setStart(range.startContainer,range.startOffset);
    return r.toString()==='';
  }catch{return false}
}
function handleProtectedDeletion(el,e){
  if(!['Backspace','Delete'].includes(e.key))return false;
  if(e.target?.closest?.('td[data-table-cell][data-table-cell-editing="1"]'))return false;
  if(inlineTable?.isConnected&&inlineTableSelected.size){e.preventDefault();clearSelectedInlineTableCellContents();return true}
  if(state.selectedImage?.isConnected||selectedCharacterCard()||$('.selected-duels-component',$('#editPage'))){e.preventDefault();return true}
  const sel=getSelection();if(!sel.rangeCount)return false;const range=sel.getRangeAt(0);
  const here=(range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement)?.closest?.('p');
  if(range.collapsed&&here&&el.contains(here)){
    const atBoundary=e.key==='Backspace'?caretAtParagraphBoundary(range,here,'start'):caretAtParagraphBoundary(range,here,'end');
    const sibling=e.key==='Backspace'?here.previousElementSibling:here.nextElementSibling;
    const protectedSibling=atBoundary?protectedEditorElement(sibling):null;
    if(protectedSibling){
      e.preventDefault();
      if(isEmptyEditorParagraph(here)){here.remove();placeCaretAfterElement(el,protectedSibling);el.dispatchEvent(new Event('input',{bubbles:true}))}
      return true;
    }
  }
  if(!range.collapsed&&selectionTouchesProtectedElement(range)){e.preventDefault();return true}
  if(adjacentProtectedElement(range,e.key)){e.preventDefault();return true}
  return false;
}
function componentAtWhitespaceClick(editable,e){
  if(e.target!==editable)return null;
  const candidates=$$('img,[data-duels-component]',editable).filter(x=>{
    const r=x.getBoundingClientRect();
    return e.clientY>=r.top&&e.clientY<=r.bottom&&(e.clientX<r.left||e.clientX>r.right);
  });
  if(!candidates.length)return null;
  return candidates.sort((a,b)=>Math.abs(e.clientY-a.getBoundingClientRect().bottom)-Math.abs(e.clientY-b.getBoundingClientRect().bottom))[0];
}
function footnoteSupFromNode(node){
  const el=node?.nodeType===1?node:node?.parentElement;
  const sup=el?.closest?.('sup');
  return sup?.querySelector?.('a[data-footnote-ref]')?sup:null;
}
function caretIsAtFootnoteEnd(range,sup){
  if(!range?.collapsed||!sup)return false;
  const c=range.startContainer,o=range.startOffset;
  if(c===sup)return o>=sup.childNodes.length;
  if(!sup.contains(c))return false;
  if(c.nodeType===3)return o>=c.data.length;
  if(c.nodeType===1)return o>=c.childNodes.length;
  return false;
}
function placeCaretOutsideFootnote(editable,sup){
  if(!editable||!sup||!editable.contains(sup))return false;
  let next=sup.nextSibling;
  if(!next||next.nodeType!==3){next=document.createTextNode('');sup.after(next)}
  const r=document.createRange();r.setStart(next,0);r.collapse(true);
  const sel=getSelection();sel.removeAllRanges();sel.addRange(r);state.savedRange=r.cloneRange();return true;
}
function normalizeFootnoteCaretForInput(editable){
  const sel=getSelection();if(!sel?.rangeCount)return false;
  const r=sel.getRangeAt(0);if(!r.collapsed)return false;
  const sup=footnoteSupFromNode(r.startContainer);
  if(!sup||!editable.contains(sup)||!caretIsAtFootnoteEnd(r,sup))return false;
  return placeCaretOutsideFootnote(editable,sup);
}
function bindEditable(el){
  el.addEventListener('focusin',()=>{state.lastEditable=el});
  el.addEventListener('mousedown',e=>{state.lastEditable=el;if(e.target!==el)clearComponentCaretAnchors(el)});
  el.addEventListener('mouseup',()=>{const sel=getSelection();if(sel?.rangeCount){const r=sel.getRangeAt(0),sup=footnoteSupFromNode(r.startContainer);if(sup&&caretIsAtFootnoteEnd(r,sup))placeCaretOutsideFootnote(el,sup)}rememberSelection()});
  el.addEventListener('keyup',e=>{if(['ArrowRight','End'].includes(e.key))normalizeFootnoteCaretForInput(el);rememberSelection()});
  el.addEventListener('keydown',e=>handleProtectedDeletion(el,e));
  el.addEventListener('compositionstart',()=>{normalizeFootnoteCaretForInput(el);const sel=getSelection();const anchor=(sel?.anchorNode?.nodeType===1?sel.anchorNode:sel?.anchorNode?.parentElement)?.closest?.('[data-component-caret-anchor]');if(anchor&&el.contains(anchor)){const ref=anchor.previousElementSibling;if(ref)paragraphAfterElement(el,ref,'')}});
  el.addEventListener('beforeinput',e=>{
    if(e.inputType?.startsWith('insert'))normalizeFootnoteCaretForInput(el);
    const sel=getSelection();if(!sel.rangeCount)return;
    const anchor=(sel.anchorNode?.nodeType===1?sel.anchorNode:sel.anchorNode?.parentElement)?.closest?.('[data-component-caret-anchor]');
    if(!anchor||!el.contains(anchor))return;
    if(e.inputType==='insertText'){
      e.preventDefault();const ref=anchor.previousElementSibling;const text=e.data||'';if(ref)paragraphAfterElement(el,ref,text);return;
    }
    if(e.inputType==='insertParagraph'||e.inputType==='insertLineBreak'){
      e.preventDefault();const ref=anchor.previousElementSibling;if(ref)paragraphAfterElement(el,ref,'');return;
    }
    if(e.inputType?.startsWith('delete')){e.preventDefault();anchor.remove();return}
  });
  el.addEventListener('click',e=>{
    const whitespaceElement=componentAtWhitespaceClick(el,e);
    if(whitespaceElement){
      e.preventDefault();
      clearObjectSelection(true);
      $$('.selected-duels-component').forEach(x=>x.classList.remove('selected-duels-component'));
      placeComponentSideCaret(el,whitespaceElement);
      return;
    }
    const component=e.target.closest('[data-duels-component]');
    if(component&&el.contains(component)){
      const tableCell=e.target.closest('td[data-table-cell]');
      if(component.dataset.duelsComponent==='table'&&tableCell?.dataset.tableCellEditing==='1'){state.lastEditable=tableCell;rememberSelection();return}
      e.preventDefault();
      clearImageSelection();
      if(component.dataset.duelsComponent==='table'){
        if(inlineTableSuppressClick)return;
        selectInlineTable(component,true);if(tableCell)selectSingleInlineTableCell(component,tableCell);
      }else{$$('.selected-duels-component').forEach(x=>x.classList.remove('selected-duels-component'));clearInlineTableSelection()}
      clearComponentCaretAnchors(el);
      return;
    }
    if(e.target.tagName==='IMG'){ selectImage(e.target); return; }
    $$('.selected-duels-component').forEach(x=>x.classList.remove('selected-duels-component'));
    if(!e.target.closest('img')) clearObjectSelection(true);
  });
  el.addEventListener('dblclick',e=>{
    const component=e.target.closest('[data-duels-component]');
    if(component&&el.contains(component)){
      e.preventDefault();
      clearComponentCaretAnchors(el);
      clearImageSelection();
      $$('.selected-duels-component').forEach(x=>x.classList.remove('selected-duels-component'));
      component.classList.add('selected-duels-component');
      if(component.dataset.duelsComponent==='table'){const td=e.target.closest('td[data-table-cell]');selectInlineTable(component,true);if(td)beginInlineTableCellEdit(component,td,e);return}
      clearInlineTableSelection();openComponentEditor(component);
    }
  });
}
function rememberSelection(){ const sel=getSelection(); if(sel.rangeCount&&state.editing){ const r=sel.getRangeAt(0); if($('#editPage')?.contains(r.commonAncestorContainer))state.savedRange=r.cloneRange(); } }
function restoreSelection(){ if(!state.savedRange)return; const sel=getSelection(); sel.removeAllRanges(); sel.addRange(state.savedRange); }
function lineBlock(node,editable){
  let el=node?.nodeType===1?node:node?.parentElement;
  if(!el||!editable?.contains(el))return null;
  const li=el.closest('li');
  if(li&&editable.contains(li))return li;
  let block=el.closest('p,blockquote,div');
  while(block&&block!==editable&&block.parentElement!==editable){
    if(block.parentElement?.matches?.('li'))return block.parentElement;
    block=block.parentElement?.closest?.('p,blockquote,div');
  }
  return block&&block!==editable?block:null;
}
function normalizeListCommandDom(editable){
  // Chromium의 execCommand 목록 명령은 contenteditable 안의 <p> 내부에
  // <ul>/<ol>을 중첩시키는 경우가 있다. 저장 전에 Word식 블록 구조로 정리한다.
  $$('p > ul:only-child,p > ol:only-child,div > ul:only-child,div > ol:only-child',editable).forEach(list=>{
    const parent=list.parentElement;
    if(!parent||parent===editable)return;
    const meaningful=[...parent.childNodes].filter(n=>{
      if(n===list)return false;
      if(n.nodeType===3)return !!n.textContent.trim();
      return !(n.nodeType===1&&n.tagName==='BR');
    });
    if(!meaningful.length)parent.replaceWith(list);
  });

  // 목록 해제 시 브라우저가 editable 바로 아래에 텍스트+<br>를 남기는 경우를
  // 다시 일반 문단으로 감싼다. 다른 블록/컴포넌트는 건드리지 않는다.
  let node=editable.firstChild;
  while(node){
    const isLooseText=node.nodeType===3&&!!node.textContent.trim();
    const isLooseBr=node.nodeType===1&&node.tagName==='BR';
    if(isLooseText||isLooseBr){
      const p=document.createElement('p');
      editable.insertBefore(p,node);
      let cur=node;
      let afterGroup=null;
      while(cur){
        const after=cur.nextSibling;
        if(cur.nodeType===3||cur.nodeType===1&&cur.tagName==='BR'){
          p.appendChild(cur);
          afterGroup=after;
          if(cur.nodeType===1&&cur.tagName==='BR')break;
          cur=after;
          continue;
        }
        afterGroup=cur;
        break;
      }
      if(!p.textContent.trim()&&!p.querySelector('br'))p.innerHTML='<br>';
      node=afterGroup;
      continue;
    }
    node=node.nextSibling;
  }
}
function execLineList(cmd){
  restoreSelection();
  const sel=getSelection();
  if(!sel?.rangeCount)return;
  const anchorEl=(sel.anchorNode?.nodeType===1?sel.anchorNode:sel.anchorNode?.parentElement);
  const editable=anchorEl?.closest?.('.editable');
  if(!editable)return;

  // insertUnorderedList / insertOrderedList 자체가 블록(줄) 단위 명령이다.
  // 문자 선택 범위를 임의로 부모 노드 경계까지 확장하면 Chromium에서 명령이
  // 무시되는 경우가 있으므로, 사용자의 실제 선택 범위를 그대로 복원해 실행한다.
  editable.focus({preventScroll:true});
  const ok=document.execCommand(cmd,false,null);
  if(!ok)return;
  normalizeListCommandDom(editable);
  editable.dispatchEvent(new Event('input',{bubbles:true}));
  rememberSelection();
}
function exec(cmd,value=null){
  if(cmd==='insertUnorderedList'||cmd==='insertOrderedList'){
    execLineList(cmd);
    return;
  }
  restoreSelection();
  const editable=(getSelection()?.anchorNode?.nodeType===1?getSelection()?.anchorNode:getSelection()?.anchorNode?.parentElement)?.closest?.('[data-table-cell-editing="1"],.editable');
  if(editable)editable.focus({preventScroll:true});
  document.execCommand(cmd,false,value);
  rememberSelection();
}
$$('[data-cmd]').forEach(b=>b.onclick=()=>exec(b.dataset.cmd));
function selectedCharacterCard(){return $('.selected-duels-component[data-duels-component="character-card"]',$('#editPage'))}
function setCharacterCardAlign(value){const card=selectedCharacterCard();if(!card)return false;const data=componentPayload(card);data.align=cardAlign(value);renderCharacterCardElement(card,data);card.classList.add('selected-duels-component');card.closest('.editable')?.dispatchEvent(new Event('input',{bubbles:true}));return true}
$$('[data-align]').forEach(b=>b.onclick=()=>{const a=b.dataset.align;if(a!=='justify'&&setCharacterCardAlign(a))return;exec(a==='left'?'justifyLeft':a==='center'?'justifyCenter':a==='right'?'justifyRight':'justifyFull')});
$('#textColor').oninput=e=>exec('foreColor',e.target.value);
$('#highlightColor').oninput=e=>exec('hiliteColor',e.target.value);
$('#fontSizeInput').onchange=e=>applyFontSize(Number(e.target.value)||16);
$('#clearFormatBtn').onclick=()=>{exec('removeFormat');exec('unlink');};
function applyFontSize(px){ restoreSelection(); document.execCommand('fontSize',false,'7'); $$('font[size="7"]',$('#editPage')).forEach(f=>{const span=document.createElement('span');span.style.fontSize=`${Math.max(8,Math.min(96,px))}px`;span.innerHTML=f.innerHTML;f.replaceWith(span)}); rememberSelection(); }
function currentBlocks(){
  const sel=getSelection(); if(!sel.rangeCount)return[]; const range=sel.getRangeAt(0); const root=range.commonAncestorContainer.nodeType===1?range.commonAncestorContainer:range.commonAncestorContainer.parentElement; const editable=root?.closest?.('[data-table-cell-editing="1"],.editable'); if(!editable)return[];
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


function currentFootnoteTarget(){
  const r=state.savedRange;if(!r)return null;const el=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement;const editable=el?.closest?.('.editable,[data-footnote-target="1"]');if(!editable||!editable.isConnected||!$('#editPage')?.contains(editable)||editable.dataset.footnoteEditor)return null;return editable;
}
function captureFootnoteInsertionPoint(){
  rememberSelection();const editable=currentFootnoteTarget();if(!editable)return false;
  state.footnoteInsertionRange=state.savedRange.cloneRange();state.footnoteInsertionEditable=editable;return true;
}
function clearFootnoteInsertionPoint(){state.footnoteInsertionRange=null;state.footnoteInsertionEditable=null}
function makeFootnoteReferenceNode(id){const a=document.createElement('a');a.className='footnote-ref';a.dataset.footnoteRef=id;a.contentEditable='false';const n=footnoteNumber(editingContent,id);a.href=`#${footnoteAnchor(id)}`;a.textContent=`[${n??'?'}]`;a.removeAttribute('title');const sup=document.createElement('sup');sup.append(a);return sup}
function insertFootnoteReference(id){
  const editable=state.footnoteInsertionEditable;const stored=state.footnoteInsertionRange;if(!editable||!stored||!editable.isConnected||!$('#editPage')?.contains(editable)){clearFootnoteInsertionPoint();alert('각주를 넣을 위치에 커서를 놓아주세요.');return false}
  let r;try{r=stored.cloneRange()}catch{clearFootnoteInsertionPoint();return false}if(!editable.contains(r.commonAncestorContainer)){clearFootnoteInsertionPoint();return false}
  editable.focus({preventScroll:true});const sel=getSelection();sel.removeAllRanges();sel.addRange(r);
  const sup=makeFootnoteReferenceNode(id);r.deleteContents();r.insertNode(sup);placeCaretOutsideFootnote(editable,sup);clearFootnoteInsertionPoint();editable.dispatchEvent(new Event('input',{bubbles:true}));return true;
}
function openFootnoteDialog(){
  if(!captureFootnoteInsertionPoint()){alert('각주를 넣을 위치에 커서를 놓은 뒤 다시 눌러주세요.');return}
  const notes=editingContent.footnotes||[];
  openModal(`<div class="footnote-modal"><h2>각주 삽입</h2><p class="muted">기존 각주를 다시 참조하거나 새 각주를 추가할 수 있습니다.</p>${notes.length?`<div class="footnote-choice-list">${notes.map((f,i)=>`<button type="button" class="footnote-choice" data-footnote-choice="${escapeHtml(f.id)}"><span>[${i+1}]</span><span>${escapeHtml((new DOMParser().parseFromString(f.contentHtml||'','text/html').body.textContent||'내용 없음').trim().slice(0,80)||'내용 없음')}</span></button>`).join('')}</div>`:'<div class="footnote-empty">아직 등록된 각주가 없습니다.</div>'}<div class="footnote-new"><label>새 각주</label><textarea id="newFootnoteText" rows="4" placeholder="각주 내용을 입력하세요."></textarea></div><div class="modal-actions"><button id="cancelFootnote">취소</button><button id="createFootnote" class="primary">새 각주 추가</button></div></div>`);
  $('#cancelFootnote').onclick=()=>{clearFootnoteInsertionPoint();closeModal()};
  $$('.footnote-choice').forEach(b=>b.onclick=()=>{const id=b.dataset.footnoteChoice;closeModal();insertFootnoteReference(id)});
  $('#createFootnote').onclick=()=>{const text=$('#newFootnoteText').value.trim();if(!text){$('#newFootnoteText').focus();return}const id=uid('fn');editingContent.footnotes.push({id,contentHtml:`<p>${escapeHtml(text).replace(/\n/g,'<br>')}</p>`});closeModal();refreshFootnoteBlock();insertFootnoteReference(id);};
  $('#newFootnoteText').focus();
}
$('#footnoteBtn').onclick=openFootnoteDialog;
$('#duelsRefBtn').onclick=openDuelsReferenceDialog;

function normalizeImageUrl(url){try{const u=new URL(url);if(u.hostname==='github.com'){const p=u.pathname.split('/').filter(Boolean),bi=p.indexOf('blob');if(bi>=2&&p[bi+1])return `https://raw.githubusercontent.com/${p[0]}/${p[1]}/${p[bi+1]}/${p.slice(bi+2).join('/')}`;}return url}catch{return url}}
$('#imageUrlBtn').onclick=()=>{openModal(`<h2>그림 링크 삽입</h2><div class="form-row"><label>PNG/JPG 이미지 URL</label><input id="imageUrl" data-character-image-presets="1" placeholder="https://github.com/.../blob/.../image.png"></div><div class="modal-actions"><button id="cancelImage">취소</button><button id="insertImage" class="primary">삽입</button></div>`);$('#cancelImage').onclick=closeModal;$('#insertImage').onclick=()=>{const url=normalizeImageUrl($('#imageUrl').value.trim());if(!/\.(png|jpe?g)(\?|$)/i.test(url)){alert('PNG/JPG 링크만 사용할 수 있습니다.');return}insertImage(url);closeModal()}};
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


function textLinesHtml(value){return escapeHtml(String(value||'')).replace(/\r?\n/g,'<br>')}
function componentPayload(el){
  try{return JSON.parse(decodeURIComponent(el.dataset.duelsData||''))}catch{return{}}
}
function setComponentPayload(el,data){el.dataset.duelsData=encodeURIComponent(JSON.stringify(data))}
function componentColor(v){return /^#[0-9a-f]{6}$/i.test(String(v||''))?v:'#44aaff'}
function legacyCharacterCardText(data){
  if(data.text!==undefined)return String(data.text||'');
  return [data.name,data.title,data.description,data.skills]
    .map(v=>String(v||'').trim()).filter(Boolean).join('\n');
}
function characterCardTextHtml(value){
  const lines=String(value||'').split(/\r?\n/);
  return lines.map(line=>`<div>${line.trim()?escapeHtml(line):'<br>'}</div>`).join('');
}
function cardDimension(v,fallback,min,max){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback}
function cardFade(v){return ['none','soft','normal','strong'].includes(String(v||''))?String(v):'normal'}
function cardAlign(v){return ['left','center','right'].includes(String(v||''))?String(v):'left'}
const CARD_RATIO_PRESETS=Object.freeze({
  'duels':{label:'듀얼즈 카드 비율',ratio:138/222},
  'portrait-3-4':{label:'세로 3:4',ratio:3/4},
  'square':{label:'1:1',ratio:1},
  'landscape-3-2':{label:'누운 카드 3:2',ratio:3/2},
  'landscape-16-9':{label:'누운 카드 16:9',ratio:16/9}
});
function applyCardRatioPreset(key){
  const height=cardDimension($('#ccHeight')?.value,222,100,1200);
  if(key==='profile'){$('#ccWidth').value=400;$('#ccHeight').value=400;return}
  const preset=CARD_RATIO_PRESETS[key];if(!preset)return;
  $('#ccWidth').value=cardDimension(Math.round(height*preset.ratio),138,80,1200);
}
function renderCharacterCardElement(el,data){
  const color=componentColor(data.color),image=String(data.image||'').trim(),text=legacyCharacterCardText(data);
  const width=cardDimension(data.width,138,80,1200),height=cardDimension(data.height,222,100,1200),fade=cardFade(data.fade),align=cardAlign(data.align);
  const selected=el.classList.contains('selected-duels-component');
  el.className='duels-character-card'+(selected?' selected-duels-component':'');
  el.setAttribute('contenteditable','false');
  el.removeAttribute('tabindex');
  el.dataset.fade=fade;
  el.dataset.align=align;
  el.style.setProperty('--duels-card-color',color);
  el.style.setProperty('--duels-card-width',`${width}px`);
  el.style.setProperty('--duels-card-height',`${height}px`);
  setComponentPayload(el,{color,image,text,width,height,fade,align});
  el.innerHTML=`${image?`<div class="duels-character-card-image" style="background-image:url(&quot;${escapeHtml(mediaSrc(image))}&quot;)"></div>`:'<div class="duels-character-card-image empty"></div>'}<div class="duels-character-card-shade"></div><div class="duels-character-card-copy">${characterCardTextHtml(text)}</div>`;
}
function makeCharacterCard(data){const el=document.createElement('div');el.dataset.duelsComponent='character-card';renderCharacterCardElement(el,data);return el}
function renderDescriptionBoxElement(el,data){
  const color=componentColor(data.color),title=String(data.title??'').trim(),body=String(data.body||''),hasBody=body.trim().length>0;
  el.className='duels-description-box';el.setAttribute('contenteditable','false');el.style.setProperty('--duels-box-color',color);setComponentPayload(el,{title,color,body});
  el.innerHTML=`${title?`<div class="duels-description-box-title">${escapeHtml(title)}</div>`:''}${hasBody?`<div class="duels-description-box-body">${textLinesHtml(body)}</div>`:''}`;
}
function makeDescriptionBox(data){const el=document.createElement('div');el.dataset.duelsComponent='description-box';renderDescriptionBoxElement(el,data);return el}
function upgradeDuelsComponents(root){
  $$('[data-duels-component="character-card"]',root).forEach(el=>renderCharacterCardElement(el,componentPayload(el)));
  $$('[data-duels-component="description-box"]',root).forEach(el=>renderDescriptionBoxElement(el,componentPayload(el)));
  $$('[data-duels-component="table"]',root).forEach(el=>renderTableElement(el,componentPayload(el)));
}

function tableInt(v,fallback,min,max){const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback}
function tableColor(v,fallback='#2a4a6a'){return /^#[0-9a-f]{6}$/i.test(String(v||''))?String(v):fallback}
function tableAlign(v){return ['left','center','right'].includes(String(v||''))?String(v):'center'}
function freshTableCell(){return{html:'',color:'#0d1520',align:'center',rowSpan:1,colSpan:1}}
function tableCellHtmlValue(cell){
  if(cell&&typeof cell.html==='string')return cell.html;
  return textLinesHtml(cell?.text||'');
}
function tableCellPlainText(cell){
  const t=document.createElement('template');t.innerHTML=tableCellHtmlValue(cell);return (t.content.textContent||'').trim();
}
function cloneTableData(data){return JSON.parse(JSON.stringify(data))}
function normalizeTableData(raw={}){
  const rows=tableInt(raw.rows,2,1,20),cols=tableInt(raw.cols,2,1,20);
  const baseWidth=tableInt(raw.baseWidth??raw.width,400,120,4000);
  let widths=Array.isArray(raw.colWidths)?raw.colWidths.slice(0,cols).map(x=>tableInt(x,Math.max(40,Math.round(baseWidth/cols)),40,2000)):[];
  while(widths.length<cols)widths.push(Math.max(40,Math.round(baseWidth/cols)));
  if(!raw.colWidths){const each=Math.floor(baseWidth/cols),rest=baseWidth-each*cols;widths=Array.from({length:cols},(_,i)=>Math.max(40,each+(i<rest?1:0)));}
  const src=Array.isArray(raw.cells)?raw.cells:[];
  const cells=Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>{
    const x=src?.[r]?.[c];
    if(x===null)return null;
    return{html:tableCellHtmlValue(x||{}),color:tableColor(x?.color,'#0d1520'),align:tableAlign(x?.align),rowSpan:tableInt(x?.rowSpan,1,1,rows-r),colSpan:tableInt(x?.colSpan,1,1,cols-c)};
  }));
  const out={rows,cols,baseWidth,borderColor:tableColor(raw.borderColor),fitWidth:raw.fitWidth===true,colWidths:widths,cells};
  rebuildTableCoverage(out);
  return out;
}
function rebuildTableCoverage(data){
  const rows=data.rows,cols=data.cols;
  const origins=[];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)if(data.cells?.[r]?.[c])origins.push([r,c,data.cells[r][c]]);
  data.cells=Array.from({length:rows},()=>Array.from({length:cols},()=>undefined));
  for(const [r,c,cell] of origins){
    if(r>=rows||c>=cols||data.cells[r][c]!==undefined)continue;
    cell.rowSpan=tableInt(cell.rowSpan,1,1,rows-r);cell.colSpan=tableInt(cell.colSpan,1,1,cols-c);
    let rs=cell.rowSpan,cs=cell.colSpan;
    outer:for(let rr=r;rr<r+rs;rr++)for(let cc=c;cc<c+cs;cc++)if(data.cells[rr][cc]!==undefined){rs=1;cs=1;break outer}
    cell.rowSpan=rs;cell.colSpan=cs;data.cells[r][c]=cell;
    for(let rr=r;rr<r+rs;rr++)for(let cc=c;cc<c+cs;cc++)if(rr!==r||cc!==c)data.cells[rr][cc]=null;
  }
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)if(data.cells[r][c]===undefined)data.cells[r][c]=freshTableCell();
  return data;
}
function tableCellMinWidth(data,c,span=1){return data.colWidths.slice(c,c+span).reduce((a,b)=>a+Number(b||0),0)}
function renderTableElement(el,raw){
  const data=normalizeTableData(raw);const selected=el.classList.contains('selected-duels-component');
  el.className='duels-table-component'+(data.fitWidth?' fit-width':'')+(selected?' selected-duels-component':'');el.setAttribute('contenteditable','false');
  el.style.setProperty('--duels-table-base-width',`${data.baseWidth}px`);el.style.setProperty('--duels-table-border',data.borderColor);setComponentPayload(el,data);
  const widthSum=Math.max(1,data.colWidths.reduce((a,b)=>a+Number(b||0),0));
  const colgroup=data.fitWidth?data.colWidths.map(w=>`<col style="width:${(Number(w||0)/widthSum*100).toFixed(6)}%">`).join(''):data.colWidths.map(w=>`<col style="min-width:${w}px;width:${w}px">`).join('');
  let html='<div class="duels-table-scroll"><table class="duels-table"><colgroup>'+colgroup+'</colgroup><tbody>';
  for(let r=0;r<data.rows;r++){
    html+='<tr>';
    for(let c=0;c<data.cols;c++){
      const cell=data.cells[r][c];if(cell===null)continue;
      const rs=cell.rowSpan>1?` rowspan="${cell.rowSpan}"`:'';const cs=cell.colSpan>1?` colspan="${cell.colSpan}"`:'';
      const mw=tableCellMinWidth(data,c,cell.colSpan);
      html+=`<td${rs}${cs} data-table-cell data-r="${r}" data-c="${c}" style="background:${cell.color};${data.fitWidth?'min-width:0;':`min-width:${mw}px;`}text-align:${tableAlign(cell.align)}">${tableCellHtmlValue(cell)||'<br>'}</td>`;
    }
    html+='</tr>';
  }
  html+='</tbody></table></div>';el.innerHTML=html;
  if(state.editing&&$('#editPage')?.contains(el))bindInlineTableInteractions(el);
  requestAnimationFrame(()=>{const table=$('.duels-table',el);if(table)el.dataset.actualWidth=String(Math.ceil(table.getBoundingClientRect().width))});
}
function makeTableComponent(data){const el=document.createElement('div');el.dataset.duelsComponent='table';renderTableElement(el,data);return el}
function tableRootAt(data,r,c){
  if(data.cells[r]?.[c])return[r,c];
  for(let rr=0;rr<=r;rr++)for(let cc=0;cc<=c;cc++){const x=data.cells[rr]?.[cc];if(x&&rr+x.rowSpan>r&&cc+x.colSpan>c)return[rr,cc]}
  return null;
}
function tableSelectedRoots(){const modal=[...document.querySelectorAll('#tableEditGrid [data-table-select]:checked')].map(x=>[Number(x.dataset.r),Number(x.dataset.c)]);return modal.length?modal:inlineTableSelectedRoots()}
function tableSetSelection(predicate,checked=true){
  $$('[data-table-select]').forEach(x=>{const r=Number(x.dataset.r),c=Number(x.dataset.c);x.checked=predicate(r,c,x)?checked:x.checked});
  tableRefreshSelectionUi();
}
function tableClearSelection(){ $$('[data-table-select]').forEach(x=>x.checked=false);tableRefreshSelectionUi() }
function tableToggleRowSelection(data,row){
  const boxes=$$('[data-table-select]').filter(x=>{const r=Number(x.dataset.r),c=Number(x.dataset.c),cell=data.cells[r]?.[c];return cell&&r<=row&&r+cell.rowSpan>row});
  const next=!boxes.length||boxes.some(x=>!x.checked);boxes.forEach(x=>x.checked=next);tableRefreshSelectionUi();
}
function tableToggleColSelection(data,col){
  const boxes=$$('[data-table-select]').filter(x=>{const r=Number(x.dataset.r),c=Number(x.dataset.c),cell=data.cells[r]?.[c];return cell&&c<=col&&c+cell.colSpan>col});
  const next=!boxes.length||boxes.some(x=>!x.checked);boxes.forEach(x=>x.checked=next);tableRefreshSelectionUi();
}
function tableRefreshSelectionUi(){
  const count=tableSelectedRoots().length;const label=$('#tableSelectionCount');if(label)label.textContent=count?`${count}개 셀 선택`:'선택 없음';
}
function tableApplySelectedBackground(data,color){
  const roots=tableSelectedRoots();if(!roots.length){alert('배경색을 바꿀 셀을 먼저 선택하세요.');return false}
  color=tableColor(color,'#0d1520');for(const [r,c] of roots){if(data.cells[r]?.[c])data.cells[r][c].color=color}
  return true;
}
function tableEqualizeColumns(data){
  const total=Math.max(1,data.baseWidth);const each=Math.floor(total/data.cols),rest=total-each*data.cols;
  data.colWidths=Array.from({length:data.cols},(_,i)=>each+(i<rest?1:0));
  return data;
}
function tableMergeSelection(data){
  const roots=tableSelectedRoots();if(roots.length<2){alert('병합할 셀을 2개 이상 선택하세요.');return false}
  const selected=new Set(roots.map(([r,c])=>`${r}:${c}`));let minR=99,minC=99,maxR=-1,maxC=-1;
  for(const [r,c] of roots){const cell=data.cells[r]?.[c];if(!cell)continue;minR=Math.min(minR,r);minC=Math.min(minC,c);maxR=Math.max(maxR,r+cell.rowSpan-1);maxC=Math.max(maxC,c+cell.colSpan-1)}
  if(maxR<0)return false;
  for(let r=minR;r<=maxR;r++)for(let c=minC;c<=maxC;c++){const root=tableRootAt(data,r,c);if(!root||!selected.has(`${root[0]}:${root[1]}`)){alert('병합하려는 셀은 빈틈 없는 사각형 영역이어야 합니다.');return false}}
  const cells=roots.map(([r,c])=>data.cells[r][c]).filter(Boolean);const first=data.cells[minR][minC];
  if(!first){alert('병합 영역의 왼쪽 위 셀을 함께 선택하세요.');return false}
  first.html=cells.map(x=>tableCellHtmlValue(x)).filter(x=>tableCellPlainText({html:x})).join('<br>');first.rowSpan=maxR-minR+1;first.colSpan=maxC-minC+1;
  for(const [r,c] of roots)if(r!==minR||c!==minC)data.cells[r][c]=undefined;
  rebuildTableCoverage(data);return true;
}
function tableUnmergeSelection(data){
  const roots=tableSelectedRoots();if(roots.length!==1){alert('병합 해제할 셀 하나를 선택하세요.');return false}
  const [r,c]=roots[0],cell=data.cells[r]?.[c];if(!cell||cell.rowSpan===1&&cell.colSpan===1){alert('선택한 셀은 병합되어 있지 않습니다.');return false}
  const rs=cell.rowSpan,cs=cell.colSpan;cell.rowSpan=1;cell.colSpan=1;
  for(let rr=r;rr<r+rs;rr++)for(let cc=c;cc<c+cs;cc++)if(rr!==r||cc!==c)data.cells[rr][cc]=freshTableCell();
  rebuildTableCoverage(data);return true;
}
function tableInsertRow(data,index){
  index=Math.max(0,Math.min(data.rows,index));
  for(let r=0;r<data.rows;r++)for(let c=0;c<data.cols;c++){const x=data.cells[r][c];if(x&&r<index&&r+x.rowSpan>index)x.rowSpan++}
  data.cells.splice(index,0,Array.from({length:data.cols},freshTableCell));data.rows++;rebuildTableCoverage(data);
}
function tableRemoveRow(data,index){
  if(data.rows<=1){alert('표에는 최소 1개의 행이 필요합니다.');return false}
  index=Math.max(0,Math.min(data.rows-1,index));
  const movers=[];
  for(let r=0;r<data.rows;r++)for(let c=0;c<data.cols;c++){const x=data.cells[r][c];if(!x)continue;if(r===index&&x.rowSpan>1){const copy={...x,rowSpan:x.rowSpan-1};movers.push([index+1,c,copy])}else if(r<index&&r+x.rowSpan>index)x.rowSpan--}
  data.cells.splice(index,1);data.rows--;for(const [oldR,c,x] of movers){const nr=Math.max(0,oldR-1);data.cells[nr][c]=x}rebuildTableCoverage(data);return true;
}
function tableInsertCol(data,index){
  index=Math.max(0,Math.min(data.cols,index));
  for(let r=0;r<data.rows;r++)for(let c=0;c<data.cols;c++){const x=data.cells[r][c];if(x&&c<index&&c+x.colSpan>index)x.colSpan++}
  for(let r=0;r<data.rows;r++)data.cells[r].splice(index,0,freshTableCell());
  const basis=Math.max(40,Math.round(data.baseWidth/Math.max(1,data.cols)));data.colWidths.splice(index,0,basis);data.cols++;data.baseWidth=data.colWidths.reduce((a,b)=>a+b,0);rebuildTableCoverage(data);
}
function tableRemoveCol(data,index){
  if(data.cols<=1){alert('표에는 최소 1개의 열이 필요합니다.');return false}
  index=Math.max(0,Math.min(data.cols-1,index));const movers=[];
  for(let r=0;r<data.rows;r++)for(let c=0;c<data.cols;c++){const x=data.cells[r][c];if(!x)continue;if(c===index&&x.colSpan>1){movers.push([r,index+1,{...x,colSpan:x.colSpan-1}])}else if(c<index&&c+x.colSpan>index)x.colSpan--}
  for(let r=0;r<data.rows;r++)data.cells[r].splice(index,1);data.colWidths.splice(index,1);data.cols--;for(const [r,oldC,x] of movers){const nc=Math.max(0,oldC-1);data.cells[r][nc]=x}data.baseWidth=data.colWidths.reduce((a,b)=>a+b,0);rebuildTableCoverage(data);return true;
}
function resizeTableGrid(data,nextRows,nextCols){
  nextRows=tableInt(nextRows,data.rows,1,20);nextCols=tableInt(nextCols,data.cols,1,20);
  while(data.rows<nextRows)tableInsertRow(data,data.rows);
  while(data.rows>nextRows){if(!tableRemoveRow(data,data.rows-1))break}
  while(data.cols<nextCols)tableInsertCol(data,data.cols);
  while(data.cols>nextCols){if(!tableRemoveCol(data,data.cols-1))break}
  rebuildTableCoverage(data);return data;
}
function applyTableBaseWidth(data,width){
  width=tableInt(width,400,120,4000);const old=Math.max(1,data.colWidths.reduce((a,b)=>a+b,0));let next=data.colWidths.map(w=>Math.max(40,Math.round(w*width/old)));let sum=next.reduce((a,b)=>a+b,0);next[next.length-1]+=width-sum;if(next[next.length-1]<40)next[next.length-1]=40;data.colWidths=next;data.baseWidth=next.reduce((a,b)=>a+b,0);
}
function syncTableFormToData(data){
  const base=$('#tableBaseWidth');if(base)applyTableBaseWidth(data,base.value);
  const bc=$('#tableBorderColor');if(bc)data.borderColor=tableColor(bc.value);
  const fit=$('#tableFitWidth');if(fit)data.fitWidth=fit.checked;
  $$('[data-table-html]').forEach(x=>{const r=Number(x.dataset.r),c=Number(x.dataset.c);if(data.cells[r]?.[c])data.cells[r][c].html=x.innerHTML});
  $$('[data-table-color]').forEach(x=>{const r=Number(x.dataset.r),c=Number(x.dataset.c);if(data.cells[r]?.[c])data.cells[r][c].color=tableColor(x.value,'#0d1520')});
  $$('[data-table-align]').forEach(x=>{const r=Number(x.dataset.r),c=Number(x.dataset.c);if(data.cells[r]?.[c])data.cells[r][c].align=tableAlign(x.value)});
  $$('[data-col-width]').forEach(x=>{const c=Number(x.dataset.c);if(c<data.cols)data.colWidths[c]=tableInt(x.value,data.colWidths[c],40,2000)});
  data.baseWidth=data.colWidths.reduce((a,b)=>a+b,0);
}
let tableCellSelectionRange=null;
let tableActiveCell=null;
function rememberTableCellSelection(){
  const sel=getSelection();if(!sel?.rangeCount)return;
  const range=sel.getRangeAt(0);const node=range.commonAncestorContainer.nodeType===1?range.commonAncestorContainer:range.commonAncestorContainer.parentElement;
  const cell=node?.closest?.('[data-table-html]');if(!cell)return;
  tableActiveCell=cell;tableCellSelectionRange=range.cloneRange();
  $$('.table-cell-editor.active').forEach(x=>x.classList.remove('active'));cell.closest('.table-cell-editor')?.classList.add('active');
}
function restoreTableCellSelection(){
  if(!tableActiveCell?.isConnected)return false;
  tableActiveCell.focus({preventScroll:true});
  const sel=getSelection();sel.removeAllRanges();
  if(tableCellSelectionRange){try{sel.addRange(tableCellSelectionRange.cloneRange());return true}catch{}}
  const r=document.createRange();r.selectNodeContents(tableActiveCell);r.collapse(false);sel.addRange(r);tableCellSelectionRange=r.cloneRange();return true;
}
function tableInlineCommand(cmd,value=null){
  if(!restoreTableCellSelection())return;
  document.execCommand(cmd,false,value);rememberTableCellSelection();
}
function tableCellSetAlign(value){
  if(!tableActiveCell?.isConnected)return;
  const r=Number(tableActiveCell.dataset.r),c=Number(tableActiveCell.dataset.c),select=document.querySelector(`[data-table-align][data-r="${r}"][data-c="${c}"]`);
  if(select)select.value=tableAlign(value);
  tableActiveCell.style.textAlign=tableAlign(value);
}
function tableEditorHtml(data,existing){
  let cells='';for(let r=0;r<data.rows;r++){for(let c=0;c<data.cols;c++){const x=data.cells[r][c];if(x===null)continue;cells+=`<div class="table-cell-editor" style="grid-column:span ${x.colSpan};grid-row:span ${x.rowSpan}"><div class="table-cell-head"><label><input type="checkbox" data-table-select data-r="${r}" data-c="${c}"> 셀 ${r+1}-${c+1}${x.rowSpan>1||x.colSpan>1?` · ${x.rowSpan}×${x.colSpan}`:''}</label><div class="table-cell-options"><select data-table-align data-r="${r}" data-c="${c}" title="셀 정렬"><option value="left" ${tableAlign(x.align)==='left'?'selected':''}>좌측</option><option value="center" ${tableAlign(x.align)==='center'?'selected':''}>중앙</option><option value="right" ${tableAlign(x.align)==='right'?'selected':''}>우측</option></select><input type="color" data-table-color data-r="${r}" data-c="${c}" value="${tableColor(x.color,'#0d1520')}" title="셀 배경색"></div></div><div class="table-cell-rich" data-table-html data-r="${r}" data-c="${c}" contenteditable="true" style="text-align:${tableAlign(x.align)}">${tableCellHtmlValue(x)||'<br>'}</div></div>`}}
  const widths=data.colWidths.map((w,c)=>`<label class="table-col-width">열 ${c+1}<input type="number" min="1" max="2000" data-col-width data-c="${c}" value="${w}"></label>`).join('');
  const rowButtons=Array.from({length:data.rows},(_,r)=>`<button type="button" data-select-row="${r}">행 ${r+1}</button>`).join('');
  const colButtons=Array.from({length:data.cols},(_,c)=>`<button type="button" data-select-col="${c}">열 ${c+1}</button>`).join('');
  return `<div class="table-editor-shell"><h2>${existing?'표 수정':'표 삽입'}</h2><div class="table-edit-toolbar"><span class="table-tool-title">셀 텍스트</span><button type="button" data-table-cmd="bold"><b>B</b></button><button type="button" data-table-cmd="italic"><i>I</i></button><button type="button" data-table-cmd="underline"><u>U</u></button><button type="button" data-table-cmd="strikeThrough"><s>S</s></button><label>글자색 <input id="tableTextColor" type="color" value="#d7e6f2"></label><label>강조색 <input id="tableTextHighlight" type="color" value="#29435c"></label><span class="tool-divider"></span><button type="button" data-table-text-align="left">좌</button><button type="button" data-table-text-align="center">중앙</button><button type="button" data-table-text-align="right">우</button><button type="button" id="tableInternalLink">내부 링크</button><button type="button" id="tableFootnoteBtn">각주</button><button type="button" id="tableClearFormat">서식 지우기</button></div><div id="tableFootnotePanel" class="table-footnote-panel hidden"></div><div class="component-form-grid"><div class="form-row"><label>기본 가로 너비</label><div class="inline-field"><select id="tableWidthPreset"><option value="400" ${data.baseWidth===400?'selected':''}>기본 · 400px</option><option value="custom" ${data.baseWidth!==400?'selected':''}>직접 입력</option></select><input id="tableBaseWidth" type="number" min="120" max="4000" value="${data.baseWidth}"></div></div><div class="form-row"><label>표 외곽선 색상</label><input id="tableBorderColor" type="color" value="${data.borderColor}"></div><div class="form-row"><label>행 개수</label><input id="tableRows" type="number" min="1" max="20" value="${data.rows}"></div><div class="form-row"><label>열 개수</label><input id="tableCols" type="number" min="1" max="20" value="${data.cols}"></div></div><div class="table-layout-options"><label class="table-toggle"><input id="tableFitWidth" type="checkbox" ${data.fitWidth?'checked':''}><span></span><b>너비 맞춤</b><small>열 비율을 유지한 채 편집 블록 너비에 맞춤</small></label><button id="equalizeTableColumns" type="button">열 균등</button><span class="muted">병합 셀이 아닌 원래 열 기준으로 같은 너비를 배분하며 기본 크기는 유지합니다.</span></div>${existing?`<div class="table-size-status">기본 크기 <b id="tableBaseWidthLabel">${data.baseWidth}px</b> · 현재 실제 크기 <b id="tableActualWidth">${Math.max(data.baseWidth,Number(existing.dataset.actualWidth)||Math.ceil(existing.getBoundingClientRect().width)||data.baseWidth)}px</b> <button id="syncTableActual" type="button">실제 크기를 기본 크기로 동기화</button></div>`:''}<div class="table-structure-tools"><label>기준 행 <input id="tableRowIndex" type="number" min="1" max="${data.rows}" value="1"></label><button id="rowBefore" type="button">위에 행 추가</button><button id="rowAfter" type="button">아래에 행 추가</button><button id="rowRemove" type="button">행 제거</button><span class="tool-divider"></span><label>기준 열 <input id="tableColIndex" type="number" min="1" max="${data.cols}" value="1"></label><button id="colBefore" type="button">왼쪽 열 추가</button><button id="colAfter" type="button">오른쪽 열 추가</button><button id="colRemove" type="button">열 제거</button></div><div class="table-column-widths">${widths}</div><div class="table-selection-tools"><div class="table-selection-title"><b>셀 선택</b><span id="tableSelectionCount">선택 없음</span><button id="clearTableSelection" type="button">전체 해제</button></div><div class="table-selection-row"><span>행</span>${rowButtons}</div><div class="table-selection-row"><span>열</span>${colButtons}</div><div class="table-selection-row table-selection-background"><span>선택 셀 배경</span><input id="selectedTableBackground" type="color" value="#0d1520"><button id="applySelectedTableBackground" type="button">적용</button></div></div><div class="table-merge-tools"><button id="mergeTableCells" type="button">선택 셀 병합</button><button id="unmergeTableCell" type="button">병합 해제</button><span class="muted">셀 체크박스 또는 행/열 버튼으로 여러 셀을 선택할 수 있습니다.</span></div><div id="tableEditGrid" class="table-edit-grid" style="grid-template-columns:repeat(${data.cols},minmax(130px,1fr))">${cells}</div><div class="modal-actions"><button id="cancelComponent">취소</button>${existing?'<button id="deleteComponent" class="danger">삭제</button>':''}<button id="saveComponent" class="primary">${existing?'수정':'삽입'}</button></div></div>`;
}
function measureTableActualColumns(data){
  const probe=makeTableComponent(normalizeTableData(data));
  probe.style.position='fixed';probe.style.left='-10000px';probe.style.top='0';probe.style.visibility='hidden';probe.style.pointerEvents='none';probe.style.zIndex='-1';
  document.body.appendChild(probe);
  const table=$('.duels-table',probe);
  const cols=[...probe.querySelectorAll('col')].map((col,i)=>Math.max(40,Math.ceil(col.getBoundingClientRect().width||data.colWidths[i]||40)));
  const width=Math.ceil(table?.getBoundingClientRect().width||cols.reduce((a,b)=>a+b,0));
  probe.remove();
  return{width,cols};
}
function syncTableActualToBase(data){
  const measured=measureTableActualColumns(data);
  if(measured.cols.length===data.cols){data.colWidths=measured.cols;data.baseWidth=measured.cols.reduce((a,b)=>a+b,0)}
  else data.baseWidth=Math.max(data.baseWidth,measured.width);
  return data;
}
function tableFootnotePanelHtml(){
  const notes=editingContent?.footnotes||[];
  return `<div class="table-footnote-panel-card"><div class="table-footnote-panel-head"><b>셀 각주</b><button type="button" id="closeTableFootnotePanel" aria-label="닫기">×</button></div><p class="muted">현재 셀의 커서 위치에 기존 각주를 참조하거나 새 각주를 추가합니다.</p>${notes.length?`<div class="footnote-choice-list compact">${notes.map((f,i)=>`<button type="button" class="footnote-choice" data-table-footnote-choice="${escapeHtml(f.id)}"><span>[${i+1}]</span><span>${escapeHtml((new DOMParser().parseFromString(f.contentHtml||'','text/html').body.textContent||'내용 없음').trim().slice(0,60)||'내용 없음')}</span></button>`).join('')}</div>`:'<div class="footnote-empty">아직 등록된 각주가 없습니다.</div>'}<div class="table-footnote-new"><textarea id="tableNewFootnoteText" rows="3" placeholder="새 각주 내용"></textarea><button type="button" id="tableCreateFootnote" class="primary">새 각주 추가</button></div></div>`;
}
function insertTableFootnoteReference(id){
  if(!tableActiveCell?.isConnected||!restoreTableCellSelection()){alert('각주를 넣을 셀의 위치를 먼저 선택하세요.');return false}
  const sel=getSelection();if(!sel?.rangeCount)return false;const r=sel.getRangeAt(0);if(!tableActiveCell.contains(r.commonAncestorContainer))return false;
  const sup=makeFootnoteReferenceNode(id);r.deleteContents();r.insertNode(sup);placeCaretOutsideFootnote(tableActiveCell,sup);rememberTableCellSelection();syncFootnoteRefs(tableActiveCell,editingContent);return true;
}
function openTableFootnotePanel(){
  rememberTableCellSelection();if(!tableActiveCell?.isConnected){alert('각주를 넣을 셀의 위치를 먼저 선택하세요.');return}
  const panel=$('#tableFootnotePanel');if(!panel)return;panel.innerHTML=tableFootnotePanelHtml();panel.classList.remove('hidden');
  $('#closeTableFootnotePanel').onclick=()=>{panel.classList.add('hidden');panel.innerHTML=''};
  $$('[data-table-footnote-choice]',panel).forEach(b=>b.onclick=()=>{if(insertTableFootnoteReference(b.dataset.tableFootnoteChoice)){panel.classList.add('hidden');panel.innerHTML=''}});
  $('#tableCreateFootnote').onclick=()=>{const ta=$('#tableNewFootnoteText'),text=ta.value.trim();if(!text){ta.focus();return}const id=uid('fn');editingContent.footnotes.push({id,contentHtml:`<p>${escapeHtml(text).replace(/\n/g,'<br>')}</p>`});refreshFootnoteBlock();if(insertTableFootnoteReference(id)){panel.classList.add('hidden');panel.innerHTML=''}};
  $('#tableNewFootnoteText')?.focus();
}
function tableModal(existing=null){
  if(existing){selectInlineTable(existing,true);return}
  captureComponentInsertionPoint();
  openModal(`<div class="table-create-modal"><h2>표 삽입</h2><p class="muted">표 생성 후 셀을 더블클릭하면 문서 위에서 바로 내용을 수정할 수 있습니다.</p><div class="component-form-grid"><div class="form-row"><label>행 개수</label><input id="newTableRows" type="number" min="1" max="20" value="2"></div><div class="form-row"><label>열 개수</label><input id="newTableCols" type="number" min="1" max="20" value="2"></div><div class="form-row"><label>표 가로 크기</label><input id="newTableWidth" type="number" min="120" max="4000" value="400"></div><div class="form-row"><label>표 전체 테두리</label><input id="newTableBorder" type="color" value="#2a4a6a"></div></div><label class="table-ribbon-toggle table-create-fit"><input id="newTableFit" type="checkbox"><span>너비 맞춤</span></label><div class="modal-actions"><button id="cancelComponent">취소</button><button id="saveComponent" class="primary">삽입</button></div></div>`);
  $('#cancelComponent').onclick=closeModal;
  $('#saveComponent').onclick=()=>{const rows=tableInt($('#newTableRows').value,2,1,20),cols=tableInt($('#newTableCols').value,2,1,20),baseWidth=tableInt($('#newTableWidth').value,400,120,4000);const data=normalizeTableData({rows,cols,baseWidth,borderColor:$('#newTableBorder').value,fitWidth:$('#newTableFit').checked});const node=makeTableComponent(data);if(insertBlockComponent(node)){closeModal();requestAnimationFrame(()=>selectInlineTable(node,true))}};
}


// 3.59: 표 요소 선택 / 포인터 드래그 다중 선택 / 더블클릭 직접 편집 / 선택 셀 일괄 삭제.
let inlineTable=null,inlineTableActiveCell=null,inlineTableSelected=new Set(),inlineTableDrag=null,inlineTableSuppressClick=false;
function inlineCellKey(td){return td?`${Number(td.dataset.r)}:${Number(td.dataset.c)}`:''}
function inlineTableCellByKey(table,key){const [r,c]=String(key).split(':');return table?.querySelector(`td[data-table-cell][data-r="${r}"][data-c="${c}"]`)||null}
function inlineTableSelectedRoots(){if(!inlineTable)return[];return [...inlineTableSelected].map(k=>k.split(':').map(Number)).filter(([r,c])=>inlineTable.querySelector(`td[data-table-cell][data-r="${r}"][data-c="${c}"]`))}
function clearInlineCellClasses(table=inlineTable){table?.querySelectorAll('.table-cell-selected').forEach(x=>x.classList.remove('table-cell-selected'))}
function paintInlineTableSelection(){if(!inlineTable)return;clearInlineCellClasses(inlineTable);for(const key of inlineTableSelected)inlineTableCellByKey(inlineTable,key)?.classList.add('table-cell-selected');updateTableRibbonTools()}
function endInlineTableCellEdit(){if(!inlineTableActiveCell)return;commitInlineTableCell(inlineTable,inlineTableActiveCell);inlineTableActiveCell.removeAttribute('contenteditable');inlineTableActiveCell.removeAttribute('data-table-cell-editing');inlineTableActiveCell.removeAttribute('data-footnote-target');inlineTableActiveCell.classList.remove('table-cell-editing');inlineTableActiveCell=null}
function clearInlineTableSelection(){endInlineTableCellEdit();if(inlineTable){inlineTable.classList.remove('selected-duels-component');clearInlineCellClasses(inlineTable)}inlineTable=null;inlineTableSelected.clear();inlineTableDrag=null;$('#tableTabBtn')?.classList.add('hidden')}
function selectInlineTable(table,switchTab=false){if(!table?.isConnected)return;if(inlineTable&&inlineTable!==table){endInlineTableCellEdit();inlineTable.classList.remove('selected-duels-component');clearInlineCellClasses(inlineTable);inlineTableSelected.clear()}inlineTable=table;table.classList.add('selected-duels-component');$('#tableTabBtn')?.classList.remove('hidden');if(switchTab)switchRibbon('table');updateTableRibbonTools()}
function selectSingleInlineTableCell(table,td){selectInlineTable(table,false);inlineTableSelected=new Set([inlineCellKey(td)]);paintInlineTableSelection()}
function tableCellsIntersectingRect(table,r1,c1,r2,c2){const data=normalizeTableData(componentPayload(table)),minR=Math.min(r1,r2),maxR=Math.max(r1,r2),minC=Math.min(c1,c2),maxC=Math.max(c1,c2),out=new Set();for(let r=0;r<data.rows;r++)for(let c=0;c<data.cols;c++){const cell=data.cells[r]?.[c];if(!cell)continue;const er=r+cell.rowSpan-1,ec=c+cell.colSpan-1;if(!(er<minR||r>maxR||ec<minC||c>maxC))out.add(`${r}:${c}`)}return out}
function bindInlineTableInteractions(table){
  table.querySelectorAll('td[data-table-cell]').forEach(td=>{
    td.addEventListener('pointerdown',e=>{
      if(e.button!==0||td.dataset.tableCellEditing==='1')return;
      selectInlineTable(table,true);
      endInlineTableCellEdit();
      const r=Number(td.dataset.r),c=Number(td.dataset.c);
      inlineTableSelected=new Set([inlineCellKey(td)]);
      paintInlineTableSelection();
      inlineTableDrag={table,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,startR:r,startC:c,lastR:r,lastC:c,moved:false};
    });
  });
}
function inlineTableCellAtPoint(table,x,y){
  const el=document.elementFromPoint(x,y);
  const td=el?.closest?.('td[data-table-cell]');
  return td&&table?.contains(td)?td:null;
}
document.addEventListener('pointermove',e=>{
  const drag=inlineTableDrag;if(!drag||drag.pointerId!==e.pointerId||!drag.table?.isConnected)return;
  if(!(e.buttons&1)){inlineTableDrag=null;return}
  const dist=Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY);
  if(!drag.moved&&dist<4)return;
  const td=inlineTableCellAtPoint(drag.table,e.clientX,e.clientY);if(!td)return;
  const r=Number(td.dataset.r),c=Number(td.dataset.c);
  drag.moved=true;
  if(r===drag.lastR&&c===drag.lastC)return;
  drag.lastR=r;drag.lastC=c;
  inlineTableSelected=tableCellsIntersectingRect(drag.table,drag.startR,drag.startC,r,c);
  paintInlineTableSelection();
  e.preventDefault();
},{capture:true});
document.addEventListener('pointerup',e=>{
  if(!inlineTableDrag||inlineTableDrag.pointerId!==e.pointerId)return;
  if(inlineTableDrag.moved)inlineTableSuppressClick=true;
  inlineTableDrag=null;
  setTimeout(()=>inlineTableSuppressClick=false,0);
},{capture:true});
document.addEventListener('pointercancel',()=>{inlineTableDrag=null},{capture:true});
function caretRangeAtPoint(x,y){if(document.caretRangeFromPoint)return document.caretRangeFromPoint(x,y);const p=document.caretPositionFromPoint?.(x,y);if(!p)return null;const r=document.createRange();r.setStart(p.offsetNode,p.offset);r.collapse(true);return r}
function beginInlineTableCellEdit(table,td,event){selectInlineTable(table,true);endInlineTableCellEdit();inlineTableActiveCell=td;inlineTableSelected=new Set([inlineCellKey(td)]);paintInlineTableSelection();td.contentEditable='true';td.dataset.tableCellEditing='1';td.dataset.footnoteTarget='1';td.classList.add('table-cell-editing');td.focus({preventScroll:true});const point=event?caretRangeAtPoint(event.clientX,event.clientY):null,sel=getSelection();sel.removeAllRanges();if(point&&td.contains(point.commonAncestorContainer))sel.addRange(point);else{const r=document.createRange();r.selectNodeContents(td);r.collapse(false);sel.addRange(r)}state.lastEditable=td;rememberSelection()}
function commitInlineTableCell(table,td){if(!table||!td)return;const data=normalizeTableData(componentPayload(table)),r=Number(td.dataset.r),c=Number(td.dataset.c);if(data.cells[r]?.[c]){data.cells[r][c].html=storageInlineHtml(td);setComponentPayload(table,data);table.closest('.editable')?.dispatchEvent(new Event('input',{bubbles:true}))}}
function selectedInlineCells(){if(!inlineTable)return[];let cells=[...inlineTableSelected].map(k=>inlineTableCellByKey(inlineTable,k)).filter(Boolean);if(!cells.length&&inlineTableActiveCell)cells=[inlineTableActiveCell];return cells}
function selectedInlineRoots(){return selectedInlineCells().map(td=>[Number(td.dataset.r),Number(td.dataset.c)])}
function clearSelectedInlineTableCellContents(){
  if(!inlineTable?.isConnected||inlineTableActiveCell)return false;
  const roots=selectedInlineRoots();if(!roots.length)return false;
  const data=normalizeTableData(componentPayload(inlineTable));
  for(const [r,c] of roots){if(data.cells[r]?.[c])data.cells[r][c].html=''}
  refreshInlineTableAfterMutation(data,roots);return true;
}
document.addEventListener('keydown',e=>{
  if(!state.editing||!inlineTable?.isConnected||inlineTableActiveCell||!['Backspace','Delete'].includes(e.key))return;
  const target=e.target;
  if(target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
  if(clearSelectedInlineTableCellContents()){e.preventDefault();e.stopPropagation()}
});
function refreshInlineTableAfterMutation(data,roots=selectedInlineRoots()){if(!inlineTable)return;const table=inlineTable;endInlineTableCellEdit();renderTableElement(table,data);inlineTable=table;table.classList.add('selected-duels-component');$('#tableTabBtn')?.classList.remove('hidden');inlineTableSelected=new Set(roots.map(([r,c])=>`${r}:${c}`).filter(k=>inlineTableCellByKey(table,k)));if(!inlineTableSelected.size){const first=table.querySelector('td[data-table-cell]');if(first)inlineTableSelected.add(inlineCellKey(first))}paintInlineTableSelection();table.closest('.editable')?.dispatchEvent(new Event('input',{bubbles:true}))}
function updateTableRibbonTools(){const tab=$('#tableTabBtn');if(!inlineTable?.isConnected){tab?.classList.add('hidden');return}tab?.classList.remove('hidden');const data=normalizeTableData(componentPayload(inlineTable)),roots=selectedInlineRoots();if($('#tableRibbonWidth'))$('#tableRibbonWidth').value=data.baseWidth;if($('#tableRibbonBorder'))$('#tableRibbonBorder').value=data.borderColor;if($('#tableRibbonFit'))$('#tableRibbonFit').checked=data.fitWidth;const label=$('#tableRibbonSelection');if(label)label.textContent=roots.length?`${roots.length}개 셀 선택`:'셀 선택 없음';if(roots.length){const [r,c]=roots[0],cell=data.cells[r]?.[c];if(cell){if($('#tableRibbonCellWidth'))$('#tableRibbonCellWidth').value=Math.round(tableCellMinWidth(data,c,cell.colSpan));if($('#tableRibbonCellBg'))$('#tableRibbonCellBg').value=tableColor(cell.color,'#0d1520')}}}
function applyInlineCellBackground(color){if(!inlineTable)return;const data=normalizeTableData(componentPayload(inlineTable)),roots=selectedInlineRoots();if(!roots.length)return;for(const [r,c] of roots)if(data.cells[r]?.[c])data.cells[r][c].color=tableColor(color,'#0d1520');refreshInlineTableAfterMutation(data,roots)}
function applyInlineCellAlign(align){if(!inlineTable)return;const data=normalizeTableData(componentPayload(inlineTable)),roots=selectedInlineRoots();if(!roots.length)return;for(const [r,c] of roots)if(data.cells[r]?.[c])data.cells[r][c].align=tableAlign(align);refreshInlineTableAfterMutation(data,roots)}
function applyInlineCellWidth(width){if(!inlineTable)return;const data=normalizeTableData(componentPayload(inlineTable)),roots=selectedInlineRoots(),target=tableInt(width,120,40,2000);if(!roots.length)return;const touched=new Map();for(const [r,c] of roots){const cell=data.cells[r]?.[c];if(!cell)continue;const per=Math.max(40,Math.round(target/cell.colSpan));for(let cc=c;cc<c+cell.colSpan;cc++)touched.set(cc,per)}for(const [c,w] of touched)data.colWidths[c]=w;data.baseWidth=data.colWidths.reduce((a,b)=>a+b,0);refreshInlineTableAfterMutation(data,roots)}
function activeInlineCellCoord(){const cell=selectedInlineCells()[0]||inlineTable?.querySelector('td[data-table-cell]');return cell?[Number(cell.dataset.r),Number(cell.dataset.c)]:[0,0]}
function mutateInlineTable(fn){if(!inlineTable)return;const data=normalizeTableData(componentPayload(inlineTable)),roots=selectedInlineRoots();const ok=fn(data);if(ok===false)return;refreshInlineTableAfterMutation(data,roots)}
$('#tableRibbonWidth').onchange=e=>mutateInlineTable(data=>applyTableBaseWidth(data,e.target.value));
$('#tableRibbonBorder').onchange=e=>mutateInlineTable(data=>{data.borderColor=tableColor(e.target.value)});
$('#tableRibbonFit').onchange=e=>mutateInlineTable(data=>{data.fitWidth=e.target.checked});
$('#tableRibbonEqualize').onclick=()=>mutateInlineTable(data=>tableEqualizeColumns(data));
$('#tableRibbonCellWidth').onchange=e=>applyInlineCellWidth(e.target.value);
$('#tableRibbonCellBg').onchange=e=>applyInlineCellBackground(e.target.value);
$$('[data-table-ribbon-align]').forEach(b=>b.onclick=()=>applyInlineCellAlign(b.dataset.tableRibbonAlign));
$('#tableRowBefore').onclick=()=>{const [r]=activeInlineCellCoord();mutateInlineTable(data=>{tableInsertRow(data,r)})};
$('#tableRowAfter').onclick=()=>{const [r]=activeInlineCellCoord();mutateInlineTable(data=>{tableInsertRow(data,r+1)})};
$('#tableRowRemove').onclick=()=>{const [r]=activeInlineCellCoord();mutateInlineTable(data=>tableRemoveRow(data,r))};
$('#tableColBefore').onclick=()=>{const [,c]=activeInlineCellCoord();mutateInlineTable(data=>{tableInsertCol(data,c)})};
$('#tableColAfter').onclick=()=>{const [,c]=activeInlineCellCoord();mutateInlineTable(data=>{tableInsertCol(data,c+1)})};
$('#tableColRemove').onclick=()=>{const [,c]=activeInlineCellCoord();mutateInlineTable(data=>tableRemoveCol(data,c))};
$('#tableMergeCells').onclick=()=>mutateInlineTable(data=>tableMergeSelection(data));
$('#tableUnmergeCell').onclick=()=>mutateInlineTable(data=>tableUnmergeSelection(data));
$('#tableDelete').onclick=()=>{if(!inlineTable||!confirm('이 표를 삭제할까요?'))return;const table=inlineTable,host=table.closest('.editable');clearInlineTableSelection();table.remove();host?.dispatchEvent(new Event('input',{bubbles:true}));switchRibbon('home')};
document.addEventListener('input',e=>{const td=e.target.closest?.('td[data-table-cell][data-table-cell-editing="1"]');if(td&&inlineTable?.contains(td)){normalizeFootnoteCaretForInput(td);commitInlineTableCell(inlineTable,td);rememberSelection()}});

function validEditableRange(candidate){
  if(!candidate)return null;try{const r=candidate.cloneRange();const base=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement;const editable=base?.closest?.('.editable');return editable&&document.contains(editable)?{range:r,editable}:null}catch{return null}
}
function captureComponentInsertionPoint(){
  rememberSelection();let found=validEditableRange(state.savedRange);
  if(!found&&state.lastEditable?.isConnected){const r=document.createRange();r.selectNodeContents(state.lastEditable);r.collapse(false);found={range:r,editable:state.lastEditable}}
  state.componentInsertionRange=found?.range?.cloneRange()||null;
}
function insertBlockComponent(node){
  const found=validEditableRange(state.componentInsertionRange)||validEditableRange(state.savedRange);
  const editable=found?.editable||state.lastEditable;
  if(!editable?.isConnected){showStatus('구성요소를 삽입할 편집 위치를 먼저 선택하세요.',true);return false}
  const range=found?.range||(()=>{const r=document.createRange();r.selectNodeContents(editable);r.collapse(false);return r})();
  const base=range.commonAncestorContainer.nodeType===1?range.commonAncestorContainer:range.commonAncestorContainer.parentElement;
  const caretAnchor=base?.closest?.('[data-component-caret-anchor]');
  if(caretAnchor&&editable.contains(caretAnchor)){
    const ref=caretAnchor.previousElementSibling;
    if(ref){ref.insertAdjacentElement('afterend',node)}else{editable.appendChild(node)}
    caretAnchor.remove();
  }else{
    range.deleteContents();
    const block=base?.closest?.('p');
    if(block&&editable.contains(block)){
      const empty=!block.textContent.trim()&&!block.querySelector('img,[data-duels-component],br:not(:only-child)');
      if(empty)block.replaceWith(node);else block.insertAdjacentElement('afterend',node);
    }else range.insertNode(node);
  }
  const next=document.createRange();next.setStartAfter(node);next.collapse(true);const sel=getSelection();sel.removeAllRanges();sel.addRange(next);state.savedRange=next.cloneRange();state.componentInsertionRange=null;state.lastEditable=editable;
  editable.dispatchEvent(new Event('input',{bubbles:true}));return true;
}
function characterCardModal(existing=null){
  if(!existing)captureComponentInsertionPoint();else rememberSelection();const d=existing?componentPayload(existing):{};
  const text=legacyCharacterCardText(d),width=cardDimension(d.width,138,80,1200),height=cardDimension(d.height,222,100,1200),fade=cardFade(d.fade),align=cardAlign(d.align);
  openModal(`<h2>${existing?'캐릭터 카드 수정':'캐릭터 카드 삽입'}</h2><div class="form-row"><label>이미지 PNG/JPG URL 또는 /media/... 경로</label><input id="ccImage" data-character-image-presets="1" value="${escapeHtml(d.image||'')}"></div><div class="form-row"><label>카드 글씨</label><textarea id="ccText" rows="7" placeholder="원하는 글씨를 자유롭게 입력하세요.">${escapeHtml(text)}</textarea></div><div class="form-row"><label>크기 / 비율 프리셋</label><select id="ccPreset"><option value="custom">직접 입력</option><option value="profile">프로필 · 400×400</option><option value="duels">듀얼즈 카드 비율 · 138:222</option><option value="portrait-3-4">세로 3:4</option><option value="square">1:1</option><option value="landscape-3-2">누운 카드 3:2</option><option value="landscape-16-9">누운 카드 16:9</option></select><div class="muted" style="margin-top:5px">비율 프리셋은 현재 높이를 기준으로 너비를 계산합니다. ‘프로필’은 400×400 고정 크기를 바로 적용합니다.</div></div><div class="component-form-grid"><div class="form-row"><label>너비</label><input id="ccWidth" type="number" min="80" max="1200" value="${width}"></div><div class="form-row"><label>높이</label><input id="ccHeight" type="number" min="100" max="1200" value="${height}"></div><div class="form-row"><label>배치</label><select id="ccAlign"><option value="left" ${align==='left'?'selected':''}>왼쪽</option><option value="center" ${align==='center'?'selected':''}>가운데</option><option value="right" ${align==='right'?'selected':''}>오른쪽</option></select></div><div class="form-row"><label>이미지 페이드</label><select id="ccFade"><option value="none" ${fade==='none'?'selected':''}>없음</option><option value="soft" ${fade==='soft'?'selected':''}>약하게</option><option value="normal" ${fade==='normal'?'selected':''}>기본</option><option value="strong" ${fade==='strong'?'selected':''}>강하게</option></select></div><div class="form-row"><label>테두리 강조색</label><input id="ccColor" type="color" value="${componentColor(d.color)}"></div></div><p class="muted">이미지는 카드 전체를 cover 방식으로 채우며 카드 중심과 이미지 중심이 일치합니다. 비율이 맞지 않는 부분은 자동으로 잘립니다.</p><div class="modal-actions"><button id="cancelComponent">취소</button>${existing?'<button id="deleteComponent" class="danger">삭제</button>':''}<button id="saveComponent" class="primary">${existing?'수정':'삽입'}</button></div>`);
  $('#ccPreset').onchange=e=>applyCardRatioPreset(e.target.value);
  $('#cancelComponent').onclick=closeModal;
  if(existing)$('#deleteComponent').onclick=()=>{if(confirm('이 캐릭터 카드 블록을 삭제할까요?')){const host=existing.closest('.editable');existing.remove();host?.dispatchEvent(new Event('input',{bubbles:true}));closeModal()}};
  $('#saveComponent').onclick=()=>{const data={image:normalizeImageUrl($('#ccImage').value.trim()),text:$('#ccText').value,color:$('#ccColor').value,width:cardDimension($('#ccWidth').value,138,80,1200),height:cardDimension($('#ccHeight').value,222,100,1200),fade:cardFade($('#ccFade').value),align:cardAlign($('#ccAlign').value)};if(existing){renderCharacterCardElement(existing,data);existing.closest('.editable')?.dispatchEvent(new Event('input',{bubbles:true}));closeModal()}else{const node=makeCharacterCard(data);if(insertBlockComponent(node))closeModal()}};
}

function descriptionBoxModal(existing=null){
  if(!existing)captureComponentInsertionPoint();else rememberSelection();const d=existing?componentPayload(existing):{};
  openModal(`<h2>${existing?'설명 상자 수정':'설명 상자 삽입'}</h2><div class="form-row"><label>제목 <span class="muted">(선택)</span></label><input id="dbTitle" value="${escapeHtml(d.title??'')}" placeholder="비워두면 제목 칸을 만들지 않습니다."></div><div class="form-row"><label>강조색</label><input id="dbColor" type="color" value="${componentColor(d.color)}"></div><div class="form-row"><label>내용</label><textarea id="dbBody" rows="8">${escapeHtml(d.body||'')}</textarea></div><p class="muted">제목이 비어 있으면 본문만, 내용이 비어 있으면 제목만 표시됩니다.</p><div class="modal-actions"><button id="cancelComponent">취소</button>${existing?'<button id="deleteComponent" class="danger">삭제</button>':''}<button id="saveComponent" class="primary">${existing?'수정':'삽입'}</button></div>`);
  $('#cancelComponent').onclick=closeModal;
  if(existing)$('#deleteComponent').onclick=()=>{if(confirm('이 설명 상자를 삭제할까요?')){const host=existing.closest('.editable');existing.remove();host?.dispatchEvent(new Event('input',{bubbles:true}));closeModal()}};
  $('#saveComponent').onclick=()=>{const data={title:$('#dbTitle').value.trim(),color:$('#dbColor').value,body:$('#dbBody').value};if(existing){renderDescriptionBoxElement(existing,data);existing.closest('.editable')?.dispatchEvent(new Event('input',{bubbles:true}));closeModal()}else{const node=makeDescriptionBox(data);if(insertBlockComponent(node))closeModal()}};
}
function openComponentEditor(el){const type=el.dataset.duelsComponent;if(type==='character-card')characterCardModal(el);else if(type==='description-box')descriptionBoxModal(el);else if(type==='table')selectInlineTable(el,true)}
$('#characterCardBtn').onclick=()=>characterCardModal();
$('#descriptionBoxBtn').onclick=()=>descriptionBoxModal();
$('#tableBtn').onclick=()=>tableModal();
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
$('#imageDeleteBtn').onclick=()=>{const img=state.selectedImage;if(!img)return;if(!confirm('선택한 그림을 삭제할까요?'))return;const host=img.closest('.editable');img.remove();clearImageSelection();host?.dispatchEvent(new Event('input',{bubbles:true}));switchRibbon('home')};
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
function clearObjectSelection(switchHome=true){clearImageSelection();clearInlineTableSelection();if(switchHome&&state.editing)switchRibbon('home')}

function clearObjectSelectionOnOutside(e){if(e.target.closest('.editable')||e.target.closest('#ribbon')||e.target.closest('#imageOverlay')||e.target.closest('.modal')||e.target.closest('.character-color-floating-grid,.character-image-floating-grid,.character-color-presets,.character-image-presets'))return;clearComponentCaretAnchors();clearObjectSelection();}
document.addEventListener('mousedown',clearObjectSelectionOnOutside);

async function showHistory(){try{const r=await api(`/api/history?path=${encodeURIComponent(state.currentPath)}`);openModal(`<h2>문서 역사</h2>${r.history.length?r.history.map(x=>`<div class="history-row"><div><code>${escapeHtml(x.sha)}</code> · ${escapeHtml(x.author)}</div><div>${escapeHtml(x.message)}</div><div class="muted">${escapeHtml(x.date)}</div></div>`).join(''):'<p>수정 이력이 없습니다.</p>'}<div class="modal-actions"><button id="closeHistory">닫기</button></div>`);$('#closeHistory').onclick=closeModal}catch(e){showStatus(e.message,true)}}

$('#newCategoryBtn').onclick=()=>{openModal(`<h2>카테고리 생성</h2><div class="form-row"><label>카테고리 이름</label><input id="newCatName"></div><div class="modal-actions"><button id="cancelNewCat">취소</button><button id="createNewCat" class="primary">생성</button></div>`);$('#cancelNewCat').onclick=closeModal;$('#createNewCat').onclick=async()=>{try{const r=await api('/api/category',{method:'POST',body:JSON.stringify({name:$('#newCatName').value})});closeModal();await refreshIndex();navigate(r.category.slug,null)}catch(e){alert(e.message)}}};
$('#newDocumentBtn').onclick=()=>{const cats=sortedCategories(state.index?.categories||[]);openModal(`<h2>문서 생성</h2><div class="form-row"><label>카테고리</label><select id="newDocCat">${cats.map(c=>`<option value="${escapeHtml(c.slug)}">${escapeHtml(c.name)}</option>`).join('')}</select></div><div class="form-row"><label>문서 제목</label><input id="newDocTitle"></div><div class="modal-actions"><button id="cancelNewDoc">취소</button><button id="createNewDoc" class="primary">생성</button></div>`);$('#cancelNewDoc').onclick=closeModal;$('#createNewDoc').onclick=async()=>{try{const cat=$('#newDocCat').value,title=$('#newDocTitle').value;const r=await api('/api/document/create',{method:'POST',body:JSON.stringify({category:cat,title,content:{type:'wiki-sections-v3',introHtml:'<p></p>',sections:[{id:uid('sec'),title:'개요',contentHtml:'<p></p>',children:[]}]}})});closeModal();await refreshIndex();navigate(cat,r.document.slug)}catch(e){alert(e.message)}}};

$('#settingsBtn').onclick=async()=>{const c=state.config||await api('/api/config');openModal(`<h2>GitHub 설정</h2><div class="form-row"><label>Owner</label><input id="cfgOwner" value="${escapeHtml(c.owner)}"></div><div class="form-row"><label>Repository</label><input id="cfgRepo" value="${escapeHtml(c.repo)}"></div><div class="form-row"><label>Branch</label><input id="cfgBranch" value="${escapeHtml(c.branch)}"></div><div class="form-row"><label>Fine-grained PAT (Contents: Read and write)</label><input id="cfgToken" type="password" placeholder="${c.tokenConfigured?'이미 저장됨 — 변경할 때만 입력':'github_pat_...'}"></div><p class="muted">토큰은 GitHub에 업로드되지 않고 이 PC의 로컬 설정에만 저장됩니다.</p><div class="modal-actions"><button id="cancelCfg">취소</button><button id="saveCfg" class="primary">저장</button></div>`);$('#cancelCfg').onclick=closeModal;$('#saveCfg').onclick=async()=>{try{const body={owner:$('#cfgOwner').value,repo:$('#cfgRepo').value,branch:$('#cfgBranch').value};if($('#cfgToken').value)body.token=$('#cfgToken').value;await api('/api/token',{method:'POST',body:JSON.stringify(body)});closeModal();location.reload()}catch(e){alert(e.message)}}};
function closeMobileSidebar(){ $('#sidebar')?.classList.remove('open'); }
$('#sidebarToggle').onclick=()=>$('#sidebar').classList.toggle('open');
window.addEventListener('resize',()=>{if(innerWidth>720)closeMobileSidebar()});
window.addEventListener('hashchange',()=>{if(state.editing&&!confirm('편집 중인 변경사항이 저장되지 않을 수 있습니다. 이동할까요?'))return;renderRoute()});

async function syncDisplayedVersion(){
  let editorVersion='unknown';
  try{
    const response=await fetch('version.json',{cache:'no-store'});
    if(response.ok){
      const meta=await response.json();
      editorVersion=String(meta?.version||'unknown');
    }
  }catch(_){ }
  const launcherVersion=String(state.config?.launcherVersion||'unknown');
  const label=$('#editorVersion');
  if(label){
    label.textContent=launcherVersion!=='unknown'&&editorVersion!=='unknown'&&launcherVersion!==editorVersion
      ?`Editor ${editorVersion} · Launcher ${launcherVersion}`
      :`Editor ${editorVersion!=='unknown'?editorVersion:launcherVersion}`;
  }
}

(async function init(){try{state.config=await api('/api/config');await syncDisplayedVersion(); if(!state.config.tokenConfigured)showStatus('GitHub Token을 설정하면 편집/저장이 가능합니다.');await refreshIndex();await renderRoute();}catch(e){showStatus(e.message,true);$('#viewPage').innerHTML=`<div class="wiki-card"><h2>초기화 실패</h2><p>${escapeHtml(e.message)}</p><p>우측 상단 GitHub 설정에서 저장소와 토큰을 확인해주세요.</p></div>`}})();

// 3.25: 모든 색 입력에 접이식 듀얼즈 캐릭터 색 프리셋을 연결한다.
enhanceColorInputs(document);
