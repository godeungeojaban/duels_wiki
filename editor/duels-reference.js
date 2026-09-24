'use strict';
(function(global){
const RAW_URL='https://raw.githubusercontent.com/LyangNem/Duels/refs/heads/main/Duels.html';
const IMAGE_BASE='https://raw.githubusercontent.com/LyangNem/Duels/refs/heads/main/character/';
const SPEED_LABELS=['매우 느림','느림','보통','빠름','매우 빠름'];
const STATUS_LABELS={bind:'속박',stun:'기절',slow:'둔화',freeze:'빙결',burn:'화상',zap:'감전',poison:'중독',bleed:'출혈',discharge:'방전',invulnerable:'무적'};
const STAT_LABELS={damage:'피해',speed:'이동속도',attackRate:'공격속도',projectileSpeed:'투사체속도',staminaRegen:'스테미나회복',staminaCost:'스테미나소모',dodgeDistance:'회피거리',dodgeSpeed:'회피속도',healing:'회복',regeneration:'재생'};
const PROFILE_METRICS=['칭호','이미지','체력','이동속도','이동속도_단계','난이도','난이도_별','스타일','사거리','역할군'];
const CACHE_KEY='duelsWiki.characterReference.v3';
const CACHE_SCHEMA=3;
const CACHE_TTL=5*60*1000;
const CACHE_MAX_AGE=24*60*60*1000;
let cache=null,loading=null;

function scanCall(text,needle){
  const start=text.indexOf(needle);if(start<0)throw new Error(`${needle} 선언을 찾을 수 없습니다.`);
  const open=text.indexOf('(',start+needle.length);if(open<0)throw new Error(`${needle} 호출 시작을 찾을 수 없습니다.`);
  let depth=0,quote='',esc=false,line=false,block=false;
  for(let i=open;i<text.length;i++){
    const c=text[i],n=text[i+1]||'';
    if(line){if(c==='\n')line=false;continue}
    if(block){if(c==='*'&&n==='/'){block=false;i++}continue}
    if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote='';continue}
    if(c==='/'&&n==='/'){line=true;i++;continue}
    if(c==='/'&&n==='*'){block=true;i++;continue}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue}
    if(c==='(')depth++;
    else if(c===')'){depth--;if(depth===0)return text.slice(open+1,i)}
  }
  throw new Error(`${needle} 호출 끝을 찾을 수 없습니다.`);
}
function evaluateObject(expr){
  const freezeCharacterData=x=>x;
  const characterValue=(path,scale=1)=>scale===1?{$ref:path}:{$ref:path,$scale:scale};
  const characterCount=(path,types=null)=>types?{$count:path,$types:types}:{$count:path};
  const characterSum=(...values)=>({$sum:values});
  const characterProduct=(...values)=>({$product:values});
  const rgba=(...a)=>`rgba(${a.join(',')})`;
  return Function('freezeCharacterData','characterValue','characterCount','characterSum','characterProduct','rgba',`return (${expr});`)(freezeCharacterData,characterValue,characterCount,characterSum,characterProduct,rgba);
}
function readPath(root,path){
  if(!path)return root;let cur=root;
  for(const part of String(path).split('.')){if(cur==null)return undefined;cur=cur[part]}
  return cur;
}
function resolveExpr(character,value,seen=new Set()){
  if(value==null||typeof value!=='object')return value;
  if(Array.isArray(value))return value.map(v=>resolveExpr(character,v,seen));
  if('$ref'in value){const key=String(value.$ref);if(seen.has(key))return undefined;const next=new Set(seen);next.add(key);const raw=readPath(character,key);const out=resolveExpr(character,raw,next);return typeof out==='number'?out*Number(value.$scale??1):out}
  if('$sum'in value){const vals=value.$sum.map(v=>Number(resolveExpr(character,v,seen)));return vals.every(Number.isFinite)?vals.reduce((a,b)=>a+b,0):undefined}
  if('$product'in value){const vals=value.$product.map(v=>Number(resolveExpr(character,v,seen)));return vals.every(Number.isFinite)?vals.reduce((a,b)=>a*b,1):undefined}
  if('$count'in value){const raw=resolveExpr(character,readPath(character,value.$count),seen);if(!Array.isArray(raw))return 0;if(!Array.isArray(value.$types))return raw.length;return raw.filter(x=>value.$types.includes(x?.type)).length}
  return value;
}
function number(character,value){const v=resolveExpr(character,value);const n=Number(v);return Number.isFinite(n)?n:null}
function fmtNumber(n){if(!Number.isFinite(n))return'';if(Math.abs(n-Math.round(n))<1e-9)return String(Math.round(n));return String(Math.round(n*1000)/1000)}
function fmtMs(n){if(!Number.isFinite(n))return'';return n%1000===0?`${n/1000}초`:`${fmtNumber(n/1000)}초`}
function fmtPercent(n){if(!Number.isFinite(n))return'';return `${fmtNumber(n*100)}%`}
function metric(map,label,value,rawPath=''){if(value==null||value==='')return;if(!map.has(label))map.set(label,{label,value:String(value),path:rawPath})}
function abilityKind(entry,counts){
  const key=String(entry?.key||'').trim(),name=String(entry?.name||'').trim();
  let base='기술';
  if(/^LMB\b/i.test(key))base='평타'; else if(/^RMB\b/i.test(key))base='스킬'; else if(/L-?Shift|Counter/i.test(key))base='반격기'; else if(/^ALWAYS$/i.test(key))base='패시브'; else base=name||key||'기술';
  const group=base==='평타'?'LMB':base==='스킬'?'RMB':base==='반격기'?'COUNTER':'OTHER';
  const multi=(counts[group]||0)>1;
  const field=(base==='패시브')?(name?`패시브 · ${name}`:'패시브'):(['평타','스킬','반격기'].includes(base)?(multi&&name?`${base} · ${name}`:base):base);
  const display=(base==='패시브')?(name?`패시브 · ${name}`:'패시브'):(['평타','스킬','반격기'].includes(base)?(name?`${base} · ${name}`:base):base);
  return {base,field,display};
}
function tooltipEntries(character){
  const list=Array.isArray(character.tooltipSkills)?character.tooltipSkills:[];
  const counts={LMB:0,RMB:0,COUNTER:0,OTHER:0};
  for(const x of list){const k=String(x?.key||'');if(/^LMB\b/i.test(k))counts.LMB++;else if(/^RMB\b/i.test(k))counts.RMB++;else if(/L-?Shift|Counter/i.test(k))counts.COUNTER++;else counts.OTHER++}
  const used=new Map(),out=[];
  for(const entry of list){
    const attackKey=entry?.attack;if(!attackKey||!character.attacks?.[attackKey])continue;
    const kind=abilityKind(entry,counts);let field=kind.field;const c=(used.get(field)||0)+1;used.set(field,c);if(c>1)field=`${field} ${c}`;
    out.push({field,display:kind.display,attackKey,entry});
  }
  return out;
}
function attackMetrics(character,attackKey){
  const attack=character.attacks?.[attackKey];if(!attack||typeof attack!=='object')return[];
  const out=new Map(),base=number(character,character.stats?.baseDamage)??100;
  const ratio=number(character,attack.damageRatio);
  if(ratio!=null&&!attack.effectsOnly)metric(out,'피해량',fmtNumber(base*ratio),'damageRatio');
  const ps=attack.progressScale?.damageRatio;
  const pFrom=number(character,ps?.from),pTo=number(character,ps?.to);
  if(pFrom!=null)metric(out,'최소피해량',fmtNumber(base*pFrom),'progressScale.damageRatio.from');
  if(pTo!=null)metric(out,'최대피해량',fmtNumber(base*pTo),'progressScale.damageRatio.to');
  const fullRatio=number(character,attack.charge?.fullSpec?.damageRatio);
  if(fullRatio!=null)metric(out,'최대피해량',fmtNumber(base*fullRatio),'charge.fullSpec.damageRatio');
  const cost=number(character,attack.cost);if(cost!=null)metric(out,'스테미나소모량',fmtNumber(cost),'cost');
  const cmin=number(character,attack.charge?.costMin),cmax=number(character,attack.charge?.fullCost??attack.charge?.costMax);
  if(cmin!=null)metric(out,'최소스테미나소모량',fmtNumber(cmin),'charge.costMin');
  if(cmax!=null)metric(out,'최대스테미나소모량',fmtNumber(cmax),'charge.fullCost');
  const cd=number(character,attack.cd);if(cd!=null)metric(out,'쿨다운',fmtMs(cd),'cd');
  const range=number(character,attack.range);if(range!=null)metric(out,'사거리',fmtNumber(range),'range');
  const delay=number(character,attack.attackDelay??attack.timing?.delay);if(delay!=null)metric(out,'선딜레이',fmtMs(delay),'attackDelay');
  const chargeDuration=number(character,attack.charge?.duration);if(chargeDuration!=null)metric(out,'차징시간',fmtMs(chargeDuration),'charge.duration');
  const modules=Array.isArray(attack.modules)?attack.modules:[];
  for(let i=0;i<modules.length;i++){
    const m=modules[i];if(!m||typeof m!=='object')continue;const t=m.type||'';
    if(t==='status.apply'){
      const status=STATUS_LABELS[m.status]||String(m.status||'상태이상');const dur=number(character,m.duration);if(dur!=null)metric(out,`${status}_지속시간`,fmtMs(dur),`modules.${i}.duration`);
      const factor=number(character,m.data?.factor);if(factor!=null)metric(out,`${status}_세기`,fmtPercent(1-factor),`modules.${i}.data.factor`);
      const mult=number(character,m.data?.staminaRegenMultiplier);if(mult!=null)metric(out,`${status}_세기`,fmtPercent(1-mult),`modules.${i}.data.staminaRegenMultiplier`);
      const flat=number(character,m.data?.flat);if(flat!=null)metric(out,`${status}_피해량`,fmtNumber(flat),`modules.${i}.data.flat`);
      const ratio2=number(character,m.data?.ratio);if(ratio2!=null)metric(out,`${status}_비율`,fmtPercent(ratio2),`modules.${i}.data.ratio`);
    }else if(t==='modifier.set'){
      const stat=STAT_LABELS[m.stat]||String(m.stat||'효과');const val=number(character,m.value),dur=number(character,m.duration);if(val!=null)metric(out,`${stat}_변화량`,fmtPercent(val),`modules.${i}.value`);if(dur!=null)metric(out,`${stat}_지속시간`,fmtMs(dur),`modules.${i}.duration`);
    }else if(t==='resource.restore'){
      const resource=m.resource==='health'?'체력':m.resource==='stamina'?'스테미나':String(m.resource||'자원');const amount=number(character,m.amount),maxRatio=number(character,m.maxResourceRatio),missingRatio=number(character,m.missingResourceRatio);if(amount!=null)metric(out,`${resource}회복량`,fmtNumber(amount),`modules.${i}.amount`);if(maxRatio!=null)metric(out,`${resource}최대치비례회복량`,fmtPercent(maxRatio),`modules.${i}.maxResourceRatio`);if(missingRatio!=null)metric(out,`${resource}손실량비례회복량`,fmtPercent(missingRatio),`modules.${i}.missingResourceRatio`);
    }else if(t==='movement.knockback'){
      const distance=number(character,m.distance);if(distance!=null)metric(out,'넉백거리',fmtNumber(distance),`modules.${i}.distance`);
    }else if(t==='movement.move'){
      const distance=number(character,m.distance);if(distance!=null)metric(out,'이동거리',fmtNumber(distance),`modules.${i}.distance`);
    }else if(t==='delivery.projectile'){
      const speed=number(character,m.speed),radius=number(character,m.radius);if(speed!=null)metric(out,'투사체속도',fmtNumber(speed),`modules.${i}.speed`);if(radius!=null)metric(out,'투사체크기',fmtNumber(radius),`modules.${i}.radius`);
    }else if(t==='pattern.scatter'){
      const count=number(character,m.count);if(count!=null)metric(out,'투사체수',fmtNumber(count),`modules.${i}.count`);
    }else if(t==='delivery.delayed-projectile-volley'){
      const count=number(character,m.count);if(count!=null)metric(out,'투사체수',fmtNumber(count),`modules.${i}.count`);const intv=number(character,m.interval);if(intv!=null)metric(out,'발사간격',fmtMs(intv),`modules.${i}.interval`);
    }else if(t==='field.area'){
      const dur=number(character,m.duration??m.field?.duration),fr=number(character,m.range??m.field?.range),intv=number(character,m.interval??m.field?.interval);if(dur!=null)metric(out,'장판지속시간',fmtMs(dur),`modules.${i}.duration`);if(fr!=null)metric(out,'장판범위',fmtNumber(fr),`modules.${i}.range`);if(intv!=null)metric(out,'장판간격',fmtMs(intv),`modules.${i}.interval`);
    }else if(t==='buff.time-add'){
      const add=number(character,m.addDuration),max=number(character,m.maxDuration);if(add!=null)metric(out,'버프추가지속시간',fmtMs(add),`modules.${i}.addDuration`);if(max!=null)metric(out,'버프최대지속시간',fmtMs(max),`modules.${i}.maxDuration`);for(let j=0;j<(m.stages||[]).length;j++){const st=m.stages[j],val=number(character,st?.value);if(val!=null){const stat=STAT_LABELS[st.stat]||String(st.stat||`단계${j+1}`);metric(out,`${stat}_버프세기`,fmtPercent(val),`modules.${i}.stages.${j}.value`)}}
    }
  }
  return [...out.values()];
}
function basicRange(character){
  const entries=tooltipEntries(character).filter(x=>/^LMB\b/i.test(String(x.entry?.key||'')));let max=null;
  for(const e of entries){const a=character.attacks?.[e.attackKey];for(const candidate of [a?.range,a?.charge?.fullSpec?.range,a?.progressScale?.range?.to]){const n=number(character,candidate);if(n!=null)max=max==null?n:Math.max(max,n)}}
  return max;
}
function speedTier(data,character){
  const n=number(character,character.stats?.speed);if(n==null)return'';const vals=[...new Set(Object.values(data).map(c=>number(c,c.stats?.speed)).filter(Number.isFinite))].sort((a,b)=>a-b);if(vals.length<=5){const idx=Math.max(0,vals.findIndex(x=>x===n));return SPEED_LABELS[Math.round(idx*(SPEED_LABELS.length-1)/Math.max(1,vals.length-1))]}
  const rank=vals.filter(x=>x<n).length/(vals.length-1);return SPEED_LABELS[Math.min(4,Math.floor(rank*5))];
}
function difficultyStars(rules,n){n=Math.max(rules?.difficulty?.min??1,Math.min(rules?.difficulty?.max??6,Math.round(Number(n)||rules?.difficulty?.default||3)));const total=rules?.difficulty?.normalStars??5;return n>=(rules?.difficulty?.specialLevel??6)?'★'.repeat(total):'★'.repeat(n)+'☆'.repeat(Math.max(0,total-n))}
function isSpecialDifficulty(rules,n){const v=Math.round(Number(n));return Number.isFinite(v)&&v>=(rules?.difficulty?.specialLevel??6)}
function profileValue(bundle,character,metricName){
  const {rules,data}=bundle;
  switch(metricName){
    case '칭호':return character.title||'';
    case '이미지':return `${IMAGE_BASE}${character.id}.png`;
    case '체력':return fmtNumber(number(character,character.stats?.maxHealth));
    case '이동속도':return fmtNumber(number(character,character.stats?.speed));
    case '이동속도_단계':return speedTier(data,character);
    case '난이도':return fmtNumber(number(character,character.stats?.difficulty));
    case '난이도_별':return difficultyStars(rules,number(character,character.stats?.difficulty));
    case '스타일':return rules?.styles?.[String(character.classification?.style)]||'';
    case '역할군':return rules?.roles?.[String(character.classification?.role)]||'';
    case '사거리':{const r=basicRange(character);if(r==null)return'';const row=(rules?.ranges||[]).find(x=>r<=Number(x.maxInclusive));return row?.tag||''}
    default:return'';
  }
}
function buildCatalog(bundle){
  const chars=Object.values(bundle.data||{}).map(character=>({
    id:character.id,
    name:character.name||character.id,
    fields:[
      {key:'프로필',label:'프로필',metrics:PROFILE_METRICS.map(x=>({
        label:x,
        value:profileValue(bundle,character,x),
        tone:(x==='난이도_별'&&isSpecialDifficulty(bundle.rules,number(character,character.stats?.difficulty)))?'difficulty-special':''
      }))},
      ...tooltipEntries(character).map(e=>({key:e.field,label:e.display,metrics:attackMetrics(character,e.attackKey)}))
    ]
  }));
  return chars.sort((a,b)=>String(a.name).localeCompare(String(b.name),'ko'));
}
function storedBundle(maxAge=CACHE_MAX_AGE){
  try{
    const raw=localStorage.getItem(CACHE_KEY);if(!raw)return null;
    const v=JSON.parse(raw),age=Date.now()-Number(v.savedAt||0);
    if(v.schema!==CACHE_SCHEMA||!Array.isArray(v.catalog)||age<0||age>maxAge)return null;
    return {catalog:v.catalog,loadedAt:Number(v.savedAt||0),fromStorage:true};
  }catch{return null}
}
function saveStored(bundle){
  try{localStorage.setItem(CACHE_KEY,JSON.stringify({schema:CACHE_SCHEMA,savedAt:bundle.loadedAt,catalog:bundle.catalog}))}catch{}
}
function cachedBundle(){return cache||storedBundle()}
async function load(force=false){
  if(cache&&!force&&Date.now()-Number(cache.loadedAt||0)<CACHE_TTL)return cache;
  if(!force){const saved=storedBundle(CACHE_TTL);if(saved){cache=saved;return saved}}
  if(loading&&!force)return loading;
  loading=(async()=>{
    const res=await fetch(RAW_URL,{cache:force?'reload':'default'});
    if(!res.ok)throw new Error(`Duels.html 불러오기 실패 (${res.status})`);
    const text=await res.text();
    const rulesExpr=scanCall(text,'const CHARACTER_RULES=freezeCharacterData');
    const dataExpr=scanCall(text,'const CHARACTER_DATA=freezeCharacterData');
    const rules=evaluateObject(rulesExpr),data=evaluateObject(dataExpr);
    if(!data||typeof data!=='object'||!Object.keys(data).length)throw new Error('CHARACTER_DATA가 비어 있습니다.');
    const work={rules,data};
    const bundle={catalog:buildCatalog(work),loadedAt:Date.now()};
    cache=bundle;saveStored(bundle);return bundle;
  })().finally(()=>{loading=null});
  return loading;
}
function findCatalogCharacter(bundle,name){const q=String(name||'').trim().toLowerCase();return (bundle?.catalog||[]).find(c=>String(c.name||'').trim().toLowerCase()===q||String(c.id||'').toLowerCase()===q)||null}
function resolve(bundle,charName,field,metricName){
  const c=findCatalogCharacter(bundle,charName);if(!c)return{ok:false,error:'캐릭터를 찾을 수 없음'};
  const f=(c.fields||[]).find(x=>x.key===field);if(!f)return{ok:false,error:field==='프로필'?'프로필을 찾을 수 없음':'기술을 찾을 수 없음'};
  const m=(f.metrics||[]).find(x=>x.label===metricName);return m?{ok:true,value:m.value,tone:m.tone||''}:{ok:false,error:field==='프로필'?'프로필 값을 찾을 수 없음':'기술 수치를 찾을 수 없음'};
}
const COMMAND_RE=/\{\{\s*=\s*duels\s*\(\s*(["'])(.*?)\1\s*,\s*(["'])(.*?)\3\s*,\s*(["'])(.*?)\5\s*\)\s*\}\}/gi;
function command(c,f,m){return `{{=duels(${JSON.stringify(c)},${JSON.stringify(f)},${JSON.stringify(m)})}}`}
function expand(root){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){const p=node.parentElement;if(!p||p.closest('code,pre,script,style,textarea,[contenteditable="true"]'))return NodeFilter.FILTER_REJECT;COMMAND_RE.lastIndex=0;return COMMAND_RE.test(node.nodeValue||'')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){const text=node.nodeValue||'';let last=0,m;COMMAND_RE.lastIndex=0;const frag=document.createDocumentFragment();while((m=COMMAND_RE.exec(text))){if(m.index>last)frag.append(document.createTextNode(text.slice(last,m.index)));const span=document.createElement('span');span.className='duels-reference-value loading';span.dataset.duelsCharacter=m[2];span.dataset.duelsField=m[4];span.dataset.duelsMetric=m[6];span.dataset.duelsCommand=m[0];span.textContent='…';frag.append(span);last=m.index+m[0].length}if(last<text.length)frag.append(document.createTextNode(text.slice(last)));node.replaceWith(frag)}
}
function applyBundle(root,bundle){
  const refs=[...root.querySelectorAll('.duels-reference-value')];
  for(const el of refs){
    const r=resolve(bundle,el.dataset.duelsCharacter,el.dataset.duelsField,el.dataset.duelsMetric);
    el.classList.remove('loading','error','difficulty-special');
    if(r.ok){el.textContent=r.value;el.title=el.dataset.duelsCommand||'';if(r.tone)el.classList.add(r.tone)}
    else{el.textContent='[참조 오류]';el.classList.add('error');el.title=`${r.error}\n${el.dataset.duelsCommand||''}`}
  }
}
async function resolveRoot(root,force=false){
  const refs=[...root.querySelectorAll('.duels-reference-value')];if(!refs.length)return;
  try{const bundle=await load(force);applyBundle(root,bundle)}catch(err){for(const el of refs){el.classList.remove('loading');el.classList.add('error');el.textContent='[참조 로드 실패]';el.title=String(err?.message||err)}}
}
function afterFirstPaint(fn){
  const run=()=>{if('requestIdleCallback'in global)global.requestIdleCallback(fn,{timeout:1200});else setTimeout(fn,0)};
  if('requestAnimationFrame'in global)global.requestAnimationFrame(()=>global.requestAnimationFrame(run));else setTimeout(run,0);
}
function scheduleResolveRoot(root){
  if(!root||!root.querySelector('.duels-reference-value'))return;
  const saved=cachedBundle();if(saved)applyBundle(root,saved);
  afterFirstPaint(()=>resolveRoot(root,false));
}
function enhance(root){if(!root)return;expand(root);scheduleResolveRoot(root)}
global.DuelsReference={RAW_URL,IMAGE_BASE,PROFILE_METRICS,load,resolve,command,enhance,expand,resolveRoot,scheduleResolveRoot};
})(window);
