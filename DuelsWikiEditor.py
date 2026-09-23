#!/usr/bin/env python3
# Duels Wiki Editor Launcher v3.59
# Standard library only. No npm / Node.js required.

from __future__ import annotations

import base64
import json
import mimetypes
import os
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

APP_VERSION = "3.59"
DEFAULT_OWNER = "godeungeojaban"
DEFAULT_REPO = "duels_wiki"
DEFAULT_BRANCH = "main"
DEFAULT_DATA_ROOT = "wiki"
DEFAULT_MEDIA_ROOT = "media"
EDITOR_FILES = ("index.html", "editor.css", "editor.js", "version.json")
UNCAT_ID = "uncategorized"
UNCAT_SLUG = "미분류"


# External game source used by the inline reference command.
# Values are never copied into wiki documents: the launcher/build resolves them
# from the current Duels source when rendering.
DUELS_SOURCE_URL = "https://raw.githubusercontent.com/LyangNem/Duels/main/Duels.html"
DUELS_ASSET_API = "https://api.github.com/repos/LyangNem/Duels/contents/character?ref=main"
DUELS_ASSET_RAW_BASE = "https://raw.githubusercontent.com/LyangNem/Duels/main/character/"
DUELS_CACHE_TTL = 300
_DUELS_CATALOG_CACHE = {"at": 0.0, "catalog": None}

_DUELS_NAME_KEYS = ("name", "displayname", "charactername", "charname", "title", "이름")
_DUELS_ID_KEYS = ("id", "key", "slug", "characterid", "charid")
_DUELS_IMAGE_KEYS = ("image", "img", "imageurl", "portrait", "portraiturl", "icon", "iconurl", "sprite", "profile", "thumbnail")
_DUELS_SKILL_KEYS = ("skills", "skillset", "skillsets", "abilities", "moves", "skill", "스킬", "스킬셋")
_DUELS_CHARACTER_MARKERS = {
    "hp", "maxhp", "health", "maxhealth", "stamina", "maxstamina", "speed", "movespeed", "movementspeed",
    "difficulty", "attack", "atk", "defense", "def", "range", "weight", "체력", "스태미나", "이동속도", "난이도",
}
_DUELS_SKILL_MARKERS = {
    "damage", "dmg", "cooldown", "cd", "range", "duration", "cost", "stamina", "knockback", "delay", "casttime",
    "피해", "데미지", "쿨다운", "사거리", "지속시간", "비용", "넉백", "선딜", "후딜",
}
_DUELS_FIELD_ALIASES = {
    "이름": ("name", "displayname", "charactername", "charname", "title", "이름"),
    "name": ("name", "displayname", "charactername", "charname", "title", "이름"),
    "이미지": ("image", "img", "imageurl", "portrait", "portraiturl", "icon", "iconurl", "sprite", "profile", "thumbnail"),
    "image": ("image", "img", "imageurl", "portrait", "portraiturl", "icon", "iconurl", "sprite", "profile", "thumbnail"),
    "체력": ("hp", "maxhp", "health", "maxhealth", "체력"), "hp": ("hp", "maxhp", "health", "maxhealth", "체력"),
    "스태미나": ("stamina", "maxstamina", "energy", "maxenergy", "스태미나"), "stamina": ("stamina", "maxstamina", "energy", "maxenergy", "스태미나"),
    "이동속도": ("speed", "movespeed", "movementspeed", "walkspeed", "이동속도"), "속도": ("speed", "movespeed", "movementspeed", "walkspeed", "이동속도"), "speed": ("speed", "movespeed", "movementspeed", "walkspeed", "이동속도"),
    "난이도": ("difficulty", "difficultyvalue", "난이도"), "difficulty": ("difficulty", "difficultyvalue", "난이도"),
    "공격력": ("attack", "atk", "power", "공격력"), "attack": ("attack", "atk", "power", "공격력"),
    "방어력": ("defense", "def", "armor", "방어력"), "defense": ("defense", "def", "armor", "방어력"),
    "캐릭터타입": ("charactertype", "character_type", "type", "combatstyle", "style", "타입", "캐릭터타입"),
    "교전사거리": ("engagementrange", "engagement_range", "combatrange", "combat_range", "rangeclass", "거리", "교전사거리"),
    "역할군": ("role", "class", "archetype", "roleclass", "역할", "역할군"),
}
_NARRATIVE_FIELD_KEYS = {"description","desc","summary","lore","background","story","flavor","설명","배경","배경설정","스토리","소개"}
_ROLE_SOURCE_ALIASES = ("classification","classify","characterclass","character_class","roletext","type","class","role","style","position","분류","역할","타입")
_ROLE_RANGES = ("초근거리","근거리","중근거리","중거리","중원거리","원거리","초원거리")

_DUELS_SKILL_FIELD_ALIASES = {
    "이름": ("name", "displayname", "skillname", "title", "이름"),
    "name": ("name", "displayname", "skillname", "title", "이름"),
    "피해": ("damage", "dmg", "basedamage", "damagevalue", "피해", "데미지"),
    "데미지": ("damage", "dmg", "basedamage", "damagevalue", "피해", "데미지"),
    "damage": ("damage", "dmg", "basedamage", "damagevalue", "피해", "데미지"),
    "쿨다운": ("cooldown", "cd", "cooldowntime", "쿨다운"),
    "cooldown": ("cooldown", "cd", "cooldowntime", "쿨다운"),
    "사거리": ("range", "attackrange", "skillrange", "사거리"),
    "range": ("range", "attackrange", "skillrange", "사거리"),
    "지속시간": ("duration", "time", "지속시간"),
    "duration": ("duration", "time", "지속시간"),
    "비용": ("cost", "staminacost", "energycost", "비용"),
    "cost": ("cost", "staminacost", "energycost", "비용"),
}


def _duels_norm_key(value: object) -> str:
    return re.sub(r"[^0-9a-z가-힣]+", "", str(value or "").lower())


def _duels_decode_js_string(raw: str) -> str:
    raw = raw.strip()
    if len(raw) < 2 or raw[0] not in "\"'`" or raw[-1] != raw[0]:
        return raw
    body = raw[1:-1]
    # JSON handles most double quoted JS strings; the fallback covers single/backtick strings.
    if raw[0] == '"':
        try:
            return json.loads(raw)
        except Exception:
            pass
    def repl(m):
        x=m.group(1)
        if x.startswith('u') and len(x)==5:
            try:return chr(int(x[1:],16))
            except Exception:return m.group(0)
        return {"n":"\n","r":"\r","t":"\t","b":"\b","f":"\f"}.get(x,x)
    return re.sub(r"\\(u[0-9a-fA-F]{4}|.)", repl, body)


def _duels_split_top_level(text: str, delimiter: str = ',') -> list[str]:
    out=[];start=0;stack=[];quote=None;esc=False;line_comment=False;block_comment=False;i=0
    pairs={')':'(',']':'[','}':'{'}
    while i < len(text):
        ch=text[i];nxt=text[i+1] if i+1<len(text) else ''
        if line_comment:
            if ch in '\r\n':line_comment=False
            i+=1;continue
        if block_comment:
            if ch=='*' and nxt=='/':block_comment=False;i+=2;continue
            i+=1;continue
        if quote:
            if esc:esc=False;i+=1;continue
            if ch=='\\':esc=True;i+=1;continue
            if ch==quote:quote=None
            i+=1;continue
        if ch=='/' and nxt=='/':line_comment=True;i+=2;continue
        if ch=='/' and nxt=='*':block_comment=True;i+=2;continue
        if ch in "\"'`":quote=ch;i+=1;continue
        if ch in '([{':stack.append(ch);i+=1;continue
        if ch in ')]}':
            if stack and stack[-1]==pairs[ch]:stack.pop()
            i+=1;continue
        if ch==delimiter and not stack:
            out.append(text[start:i]);start=i+1
        i+=1
    out.append(text[start:])
    return out


def _duels_find_top_level_colon(text: str) -> int:
    stack=[];quote=None;esc=False;line_comment=False;block_comment=False;i=0
    pairs={')':'(',']':'[','}':'{'}
    while i < len(text):
        ch=text[i];nxt=text[i+1] if i+1<len(text) else ''
        if line_comment:
            if ch in '\r\n':line_comment=False
            i+=1;continue
        if block_comment:
            if ch=='*' and nxt=='/':block_comment=False;i+=2;continue
            i+=1;continue
        if quote:
            if esc:esc=False;i+=1;continue
            if ch=='\\':esc=True;i+=1;continue
            if ch==quote:quote=None
            i+=1;continue
        if ch=='/' and nxt=='/':line_comment=True;i+=2;continue
        if ch=='/' and nxt=='*':block_comment=True;i+=2;continue
        if ch in "\"'`":quote=ch;i+=1;continue
        if ch in '([{':stack.append(ch);i+=1;continue
        if ch in ')]}':
            if stack and stack[-1]==pairs[ch]:stack.pop()
            i+=1;continue
        if ch==':' and not stack:return i
        i+=1
    return -1


def _duels_parse_number_expr(raw: str):
    import ast, operator
    if not re.fullmatch(r"[0-9eE+\-*/%().\s]+", raw):return None
    try:node=ast.parse(raw,mode='eval')
    except Exception:return None
    ops={ast.Add:operator.add,ast.Sub:operator.sub,ast.Mult:operator.mul,ast.Div:operator.truediv,ast.FloorDiv:operator.floordiv,ast.Mod:operator.mod,ast.Pow:operator.pow,ast.USub:operator.neg,ast.UAdd:operator.pos}
    def ev(n):
        if isinstance(n,ast.Expression):return ev(n.body)
        if isinstance(n,ast.Constant) and isinstance(n.value,(int,float)):return n.value
        if isinstance(n,ast.BinOp) and type(n.op) in ops:return ops[type(n.op)](ev(n.left),ev(n.right))
        if isinstance(n,ast.UnaryOp) and type(n.op) in ops:return ops[type(n.op)](ev(n.operand))
        raise ValueError
    try:
        value=ev(node)
        if isinstance(value,float) and value.is_integer():return int(value)
        return value
    except Exception:return None


def _duels_parse_value(raw: str, depth: int = 0):
    raw=raw.strip().rstrip(';')
    if not raw:return ''
    if raw[0] in "\"'`" and raw[-1:]==raw[0]:return _duels_decode_js_string(raw)
    low=raw.lower()
    if low=='true':return True
    if low=='false':return False
    if low in ('null','undefined'):return None
    num=_duels_parse_number_expr(raw)
    if num is not None:return num
    if depth<4 and raw.startswith('{') and raw.endswith('}'):
        return _duels_parse_object(raw,depth+1)
    if depth<4 and raw.startswith('[') and raw.endswith(']'):
        return [_duels_parse_value(x,depth+1) for x in _duels_split_top_level(raw[1:-1]) if x.strip()]
    # Preserve simple identifiers/expressions as source text. This still lets the
    # reference UI expose fields even when a value is computed elsewhere.
    return re.sub(r"\s+", " ", raw)[:500]


def _duels_parse_object(raw: str, depth: int = 0) -> dict:
    body=raw.strip()
    if body.startswith('{') and body.endswith('}'):body=body[1:-1]
    out={}
    for chunk in _duels_split_top_level(body):
        chunk=chunk.strip()
        if not chunk or chunk.startswith('...'):continue
        ci=_duels_find_top_level_colon(chunk)
        if ci<0:continue
        key=chunk[:ci].strip()
        if key.startswith('['):continue
        if len(key)>=2 and key[0] in "\"'`" and key[-1]==key[0]:key=_duels_decode_js_string(key)
        key=re.sub(r"\s+", "", key)
        if not key or len(key)>80:continue
        out[str(key)]=_duels_parse_value(chunk[ci+1:],depth)
    return out


def _duels_brace_pairs(source: str) -> tuple[dict[int,int], list[int]]:
    pairs={};opens=[];stack=[];quote=None;esc=False;line_comment=False;block_comment=False;i=0
    while i<len(source):
        ch=source[i];nxt=source[i+1] if i+1<len(source) else ''
        if line_comment:
            if ch in '\r\n':line_comment=False
            i+=1;continue
        if block_comment:
            if ch=='*' and nxt=='/':block_comment=False;i+=2;continue
            i+=1;continue
        if quote:
            if esc:esc=False;i+=1;continue
            if ch=='\\':esc=True;i+=1;continue
            if ch==quote:quote=None
            i+=1;continue
        if ch=='/' and nxt=='/':line_comment=True;i+=2;continue
        if ch=='/' and nxt=='*':block_comment=True;i+=2;continue
        if ch in "\"'`":quote=ch;i+=1;continue
        if ch=='{':stack.append(i);opens.append(i)
        elif ch=='}' and stack:
            op=stack.pop();pairs[op]=i
        i+=1
    return pairs,opens


def _duels_enclosing_object(pos: int, pairs: dict[int,int], opens: list[int]) -> tuple[int,int] | None:
    import bisect
    idx=bisect.bisect_left(opens,pos)-1;best=None;seen=0
    while idx>=0 and seen<3000:
        op=opens[idx];cl=pairs.get(op)
        if cl is not None and cl>=pos:
            if best is None or cl-op<best[1]-best[0]:best=(op,cl)
        elif best is not None and pos-op>best[1]-best[0]+2000:
            break
        idx-=1;seen+=1
    return best


def _duels_lookup_key(mapping: dict, aliases) -> tuple[str|None, object]:
    norm={_duels_norm_key(k):k for k in mapping}
    for a in aliases:
        k=norm.get(_duels_norm_key(a))
        if k is not None:return k,mapping.get(k)
    return None,None


def _duels_object_score(fields: dict) -> int:
    keys={_duels_norm_key(k) for k in fields}
    score=sum(2 for k in keys if k in _DUELS_CHARACTER_MARKERS)
    if any(k in keys for k in _DUELS_SKILL_KEYS):score+=4
    if any(k in keys for k in _DUELS_IMAGE_KEYS):score+=2
    if any(k in keys for k in _DUELS_ID_KEYS):score+=1
    # Base attributes are often grouped under a nested stats/status object.
    nested_stat_keys={"stats","basestats","attributes","status","abilitystats","능력치"}
    for k,v in fields.items():
        if _duels_norm_key(k) in nested_stat_keys and isinstance(v,dict):
            child_keys={_duels_norm_key(x) for x in v}
            score+=sum(2 for x in child_keys if x in _DUELS_CHARACTER_MARKERS)
            if child_keys:score+=1
    return score


def _duels_skill_score(fields: dict) -> int:
    keys={_duels_norm_key(k) for k in fields}
    return sum(1 for k in keys if k in _DUELS_SKILL_MARKERS)


def _duels_skill_list(fields: dict) -> list[dict]:
    norm={_duels_norm_key(k):k for k in fields}
    candidates=[]
    for alias in _DUELS_SKILL_KEYS:
        k=norm.get(_duels_norm_key(alias))
        if k is not None:candidates.append(fields.get(k))
    # Also support skill1/rmb/lmb style object properties.
    for k,v in fields.items():
        nk=_duels_norm_key(k)
        if isinstance(v,dict) and (nk.startswith('skill') or nk.startswith('ability') or _duels_skill_score(v)>=2):candidates.append(v)
    out=[]
    def add(v,label=None):
        if isinstance(v,list):
            for x in v:add(x)
        elif isinstance(v,dict):
            # A map of named skills can either be one skill or many child skills.
            if _duels_skill_score(v)>=1 or _duels_lookup_key(v,_DUELS_NAME_KEYS)[0]:
                blocked={_duels_norm_key(x) for x in _NARRATIVE_FIELD_KEYS}
                item={k:val for k,val in v.items() if _duels_norm_key(k) not in blocked and not (isinstance(val,str) and len(val)>180)}
                if label and _duels_lookup_key(item,_DUELS_NAME_KEYS)[0] is None:item['name']=label
                out.append(item)
            else:
                for kk,vv in v.items():
                    if isinstance(vv,dict):add(vv,kk)
        elif isinstance(v,str) and v.strip():out.append({'name':v.strip()})
    for c in candidates:add(c)
    # Stable de-duplication by a compact JSON representation.
    seen=set();result=[]
    for x in out:
        sig=json.dumps(x,ensure_ascii=False,sort_keys=True,default=str)
        if sig in seen:continue
        seen.add(sig);result.append(x)
    return result


def _duels_image_url(value, char_id: str|None, assets: dict[str,str]) -> str:
    if isinstance(value,str) and value.strip():
        v=value.strip()
        if v.startswith(('http://','https://')):return v
        v=v.lstrip('./')
        if v.startswith('character/'):return f"https://raw.githubusercontent.com/LyangNem/Duels/main/{v}"
        if re.search(r"\.(?:png|jpe?g|webp|gif|svg)(?:\?|$)",v,re.I):return DUELS_ASSET_RAW_BASE+v.split('/')[-1]
    if char_id:
        nk=_duels_norm_key(char_id)
        if nk in assets:return assets[nk]
        for ext in ('png','jpg','jpeg','webp'):
            k=_duels_norm_key(f'{char_id}.{ext}')
            if k in assets:return assets[k]
    return ''


def parse_duels_catalog(source: str, assets: dict[str,str] | None = None) -> dict:
    assets=assets or {}
    pairs,opens=_duels_brace_pairs(source)
    candidates={}
    # Objects with an explicit display/name field.
    name_re=re.compile(r'''(?i)(?:["']?(?:name|displayname|charactername|charname|이름|id|characterid|charid|slug)["']?)\s*:\s*((?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'))''')
    for m in name_re.finditer(source):
        span=_duels_enclosing_object(m.start(),pairs,opens)
        if not span:continue
        op,cl=span
        if cl-op>120000:continue
        try:fields=_duels_parse_object(source[op:cl+1])
        except Exception:continue
        if _duels_object_score(fields)<3:continue
        candidates[(op,cl)]=(None,fields)
    # Standalone declarations/assignments can carry the character id outside the object.
    # Examples: const runef = {...}, characters["runef"] = {...}.
    decl_patterns=(
        re.compile(r'(?m)\b(?:const|let|var)\s+([A-Za-z_$][\w$]{1,63})\s*=\s*\{'),
        re.compile(r'''(?m)\b[A-Za-z_$][\w$]*\s*\[\s*(["'])([^"']+)\1\s*\]\s*=\s*\{'''),
    )
    for drx in decl_patterns:
        for m in drx.finditer(source):
            outer=(m.group(2) if m.lastindex and m.lastindex>=2 else m.group(1)).strip()
            op=source.find('{',m.end()-1,m.end()+2);cl=pairs.get(op)
            if op<0 or cl is None or cl-op>120000:continue
            try:fields=_duels_parse_object(source[op:cl+1])
            except Exception:continue
            if _duels_object_score(fields)<4:continue
            candidates.setdefault((op,cl),(outer,fields))

    # Objects keyed by id/name, e.g. runef: { hp: ..., skills: ... }.
    key_re=re.compile(r'''(?m)(["']?)([A-Za-z가-힣_][A-Za-z0-9가-힣 _-]{1,39})\1\s*:\s*\{''')
    generic={"style","data","options","config","state","stats","status","player","enemy","skill","skills","ability","abilities","character","characters"}
    for m in key_re.finditer(source):
        op=source.find('{',m.end()-1,m.end()+2)
        cl=pairs.get(op)
        if op<0 or cl is None or cl-op>120000:continue
        key=m.group(2).strip()
        if _duels_norm_key(key) in generic:continue
        try:fields=_duels_parse_object(source[op:cl+1])
        except Exception:continue
        if _duels_object_score(fields)<4:continue
        candidates.setdefault((op,cl),(key,fields))
    rows=[]
    for (op,cl),(outer_key,fields) in sorted(candidates.items()):
        _,name=_duels_lookup_key(fields,_DUELS_NAME_KEYS)
        _,cid=_duels_lookup_key(fields,_DUELS_ID_KEYS)
        name=name if isinstance(name,(str,int,float)) else ''
        cid=cid if isinstance(cid,(str,int,float)) else outer_key or ''
        if not name and outer_key and re.search(r'[가-힣]',outer_key):name=outer_key
        if not name and not cid:continue
        name=str(name or cid).strip();cid=str(cid or '').strip()
        _,image_val=_duels_lookup_key(fields,_DUELS_IMAGE_KEYS)
        image=_duels_image_url(image_val,cid or outer_key,assets)
        skills=_duels_skill_list(fields)
        stat_fields={}
        reserved={_duels_norm_key(x) for x in (*_DUELS_NAME_KEYS,*_DUELS_ID_KEYS,*_DUELS_IMAGE_KEYS,*_DUELS_SKILL_KEYS)}
        nested_stat_keys={"stats","basestats","attributes","status","abilitystats","능력치"}
        blocked_fields={_duels_norm_key(x) for x in _NARRATIVE_FIELD_KEYS}
        for k,v in fields.items():
            nk=_duels_norm_key(k)
            if nk in reserved or nk in blocked_fields:continue
            if isinstance(v,str) and len(v)>180:continue
            if isinstance(v,(str,int,float,bool)) or v is None:
                stat_fields[k]=v
            elif nk in nested_stat_keys and isinstance(v,dict):
                for child_key,child_value in v.items():
                    if _duels_norm_key(child_key) in blocked_fields:continue
                    if isinstance(child_value,str) and len(child_value)>180:continue
                    if isinstance(child_value,(str,int,float,bool)) or child_value is None:
                        stat_fields.setdefault(child_key,child_value)
                        stat_fields[f"{k}.{child_key}"]=child_value
        rows.append({'name':name,'id':cid,'image':image,'fields':stat_fields,'skills':skills,'sourceOffset':op})
    # Merge duplicate objects by id/name, preferring the richer object.
    merged={}
    for row in rows:
        keys=[_duels_norm_key(row.get('id')),_duels_norm_key(row.get('name'))]
        key=next((k for k in keys if k),f"offset{row['sourceOffset']}")
        old=merged.get(key)
        richness=len(row['fields'])+4*len(row['skills'])+(2 if row['image'] else 0)
        old_rich=(len(old['fields'])+4*len(old['skills'])+(2 if old['image'] else 0)) if old else -1
        if old is None or richness>old_rich:merged[key]=row
        elif old:
            for k,v in row['fields'].items():old['fields'].setdefault(k,v)
            if not old['image'] and row['image']:old['image']=row['image']
            if not old['skills'] and row['skills']:old['skills']=row['skills']
    chars=sorted(merged.values(),key=lambda x:(str(x.get('name','')),str(x.get('id',''))))
    return {'source':DUELS_SOURCE_URL,'characters':chars,'count':len(chars)}


def _duels_fetch_assets(timeout=20) -> dict[str,str]:
    req=urllib.request.Request(DUELS_ASSET_API,headers={'Accept':'application/vnd.github+json','User-Agent':f'DuelsWikiEditor/{APP_VERSION}'})
    try:
        with urllib.request.urlopen(req,timeout=timeout) as r:data=json.loads(r.read().decode('utf-8'))
    except Exception:return {}
    out={}
    for item in data if isinstance(data,list) else []:
        if item.get('type')!='file':continue
        name=str(item.get('name') or '')
        if not re.search(r'\.(?:png|jpe?g|webp|gif|svg)$',name,re.I):continue
        url=str(item.get('download_url') or (DUELS_ASSET_RAW_BASE+urllib.parse.quote(name)))
        stem=re.sub(r'\.[^.]+$','',name)
        out[_duels_norm_key(stem)]=url
        out[_duels_norm_key(name)]=url
    return out


def fetch_duels_catalog(force: bool = False, timeout: int = 30) -> dict:
    now=time.time()
    if not force and _DUELS_CATALOG_CACHE.get('catalog') and now-float(_DUELS_CATALOG_CACHE.get('at') or 0)<DUELS_CACHE_TTL:
        return _DUELS_CATALOG_CACHE['catalog']
    cache_file=APP_HOME/'duels-source-cache.json'
    try:
        req=urllib.request.Request(DUELS_SOURCE_URL,headers={'User-Agent':f'DuelsWikiEditor/{APP_VERSION}','Accept':'text/html,*/*'})
        with urllib.request.urlopen(req,timeout=timeout) as r:source=r.read().decode('utf-8','replace')
        catalog=parse_duels_catalog(source,_duels_fetch_assets(timeout=min(timeout,20)))
        catalog['fetchedAt']=int(now)
        catalog['stale']=False
        ensure_dirs();cache_file.write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':')),'utf-8')
    except Exception as e:
        if cache_file.exists():
            try:
                catalog=json.loads(cache_file.read_text('utf-8'));catalog['stale']=True;catalog['warning']=f'최신 Duels 원본 조회 실패: {e}'
            except Exception:raise RuntimeError(f'Duels 원본 조회 실패: {e}') from e
        else:raise RuntimeError(f'Duels 원본 조회 실패: {e}') from e
    _DUELS_CATALOG_CACHE.update({'at':now,'catalog':catalog})
    return catalog


def _duels_casefold_lookup(mapping: dict, key: str, aliases: dict | None = None):
    aliases=aliases or {}
    norm={_duels_norm_key(k):k for k in mapping}
    wanted=[key]
    wanted.extend(aliases.get(_duels_norm_key(key),aliases.get(key,())))
    for w in wanted:
        real=norm.get(_duels_norm_key(w))
        if real is not None:return mapping.get(real)
    return None


def _duels_role_parts(fields: dict) -> dict:
    out={}; source=None
    aliases={_duels_norm_key(k):v for k,v in _DUELS_FIELD_ALIASES.items()}
    for label in ("캐릭터타입","교전사거리","역할군"):
        val=_duels_casefold_lookup(fields,label,aliases)
        if val in (None,""):continue
        if isinstance(val,str):
            text=val.strip()
            looks_combined=any(r in text for r in _ROLE_RANGES) and (" " in text or "/" in text or "·" in text)
            if looks_combined:
                source=source or text;continue
            if label=="캐릭터타입" and len(text.split())>1:
                source=source or text;continue
        out[label]=val
    if len(out)==3:return out
    if not source:
        for key in _ROLE_SOURCE_ALIASES:
            v=_duels_casefold_lookup(fields,key)
            if isinstance(v,str) and 2<=len(v.strip())<=80:
                source=v.strip();break
    if not source:return out
    tokens=re.sub(r"[\s/·,|>]+"," ",source).strip().split()
    if "교전사거리" not in out:
        for r in _ROLE_RANGES:
            if r in source:out["교전사거리"]=r;break
    if "캐릭터타입" not in out:
        for t in tokens:
            if t.endswith("형") and t not in _ROLE_RANGES:out["캐릭터타입"]=t;break
    if "역할군" not in out:
        left=[t for t in tokens if t!=out.get("캐릭터타입") and t!=out.get("교전사거리") and t not in _ROLE_RANGES]
        if left:out["역할군"]=left[-1]
    return out

def resolve_duels_reference(catalog: dict, character: str, field: str):
    target=_duels_norm_key(character)
    found=None
    for row in catalog.get('characters') or []:
        if target in {_duels_norm_key(row.get('name')),_duels_norm_key(row.get('id'))}:
            found=row;break
    if not found:return {'ok':False,'error':f'캐릭터를 찾을 수 없음: {character}'}
    path=str(field or '').strip()
    if not path:return {'ok':False,'error':'조회 필드가 비어 있음'}
    if _duels_norm_key(path) in ('필드','필드목록','fields'):
        return {'ok':True,'kind':'text','value':', '.join(found.get('fields',{}).keys())}
    if _duels_norm_key(path) in ('스킬목록','skills','skilllist'):
        names=[]
        for i,sk in enumerate(found.get('skills') or [],1):
            v=_duels_casefold_lookup(sk,'이름',{_duels_norm_key(k):v for k,v in _DUELS_SKILL_FIELD_ALIASES.items()})
            names.append(str(v if v not in (None,'') else f'스킬 {i}'))
        return {'ok':True,'kind':'text','value':', '.join(names)}
    skill_match=re.match(r'^(?:스킬|skill)\s*\.?\s*(\d+)(?:\.(.+))?$',path,re.I)
    if skill_match:
        idx=int(skill_match.group(1))-1;sub=(skill_match.group(2) or '이름').strip();skills=found.get('skills') or []
        if idx<0 or idx>=len(skills):return {'ok':False,'error':f'스킬 {idx+1}을 찾을 수 없음'}
        sk=skills[idx]
        if _duels_norm_key(sub) in {_duels_norm_key(x) for x in _NARRATIVE_FIELD_KEYS}:return {'ok':False,'error':'문장형 스킬 설명은 참조 대상이 아닙니다.'}
        alias_map={_duels_norm_key(k):v for k,v in _DUELS_SKILL_FIELD_ALIASES.items()}
        v=_duels_casefold_lookup(sk,sub,alias_map)
        if v is None:return {'ok':False,'error':f'스킬 {idx+1} 필드를 찾을 수 없음: {sub}'}
        return {'ok':True,'kind':'text','value':v}
    nk=_duels_norm_key(path)
    if nk in {_duels_norm_key(x) for x in _NARRATIVE_FIELD_KEYS}:return {'ok':False,'error':'문장형 설명 필드는 참조 대상이 아닙니다.'}
    for wanted in ('캐릭터타입','교전사거리','역할군'):
        if nk==_duels_norm_key(wanted):
            v=_duels_role_parts(found.get('fields') or {}).get(wanted)
            return {'ok':True,'kind':'text','value':v} if v not in (None,'') else {'ok':False,'error':f'{wanted} 정보를 찾을 수 없음: {character}'}
    if nk in ('이름','name'):return {'ok':True,'kind':'text','value':found.get('name','')}
    if nk in ('이미지','image','img','portrait'):
        if found.get('image'):return {'ok':True,'kind':'image','value':found['image']}
        return {'ok':False,'error':f'이미지를 찾을 수 없음: {character}'}
    alias_map={_duels_norm_key(k):v for k,v in _DUELS_FIELD_ALIASES.items()}
    value=_duels_casefold_lookup(found.get('fields') or {},path,alias_map)
    if value is None:
        return {'ok':False,'error':f'필드를 찾을 수 없음: {field}'}
    return {'ok':True,'kind':'text','value':value}

if os.name == "nt":
    APP_HOME = Path(os.environ.get("APPDATA", Path.home())) / "DuelsWikiEditor"
else:
    APP_HOME = Path.home() / ".duels-wiki-editor"
CACHE_DIR = APP_HOME / "editor-cache"
CONFIG_FILE = APP_HOME / "config.json"
TOKEN_FILE = Path(__file__).resolve().with_name("token.txt")


def ensure_dirs() -> None:
    APP_HOME.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def default_config() -> dict:
    return {
        "owner": DEFAULT_OWNER,
        "repo": DEFAULT_REPO,
        "branch": DEFAULT_BRANCH,
        "data_root": DEFAULT_DATA_ROOT,
        "media_root": DEFAULT_MEDIA_ROOT,
        "token": "",
    }


def _read_token_file() -> str:
    """Read a one-time token import file next to the launcher.

    Only the first non-empty, non-comment line is treated as a token.
    The caller deletes token.txt only after the imported token has been
    successfully persisted to the normal per-user config.
    """
    if not TOKEN_FILE.exists():
        return ""
    try:
        for raw in TOKEN_FILE.read_text("utf-8").splitlines():
            value = raw.strip()
            if value and not value.startswith("#"):
                return value
    except Exception as e:
        print(f"[token] token.txt 읽기 실패: {e}")
    return ""


def _delete_token_file() -> None:
    """Delete token.txt after a successful one-time import."""
    try:
        TOKEN_FILE.unlink(missing_ok=True)
    except Exception as e:
        print(f"[token] token.txt 삭제 실패: {e}")


def load_config() -> dict:
    ensure_dirs()
    cfg = default_config()
    if CONFIG_FILE.exists():
        try:
            cfg.update(json.loads(CONFIG_FILE.read_text("utf-8")))
        except Exception:
            pass

    # token.txt is a one-time portable override.
    # When it exists, its token always wins over config.json. Persist the imported
    # token first, then delete token.txt only after the config write succeeds.
    if TOKEN_FILE.exists():
        portable_token = _read_token_file()
        if portable_token:
            cfg["token"] = portable_token
            try:
                save_config(cfg)
                _delete_token_file()
                print("[token] token.txt의 GitHub Token을 우선 적용해 config.json에 저장한 뒤 파일을 삭제했습니다.")
            except Exception as e:
                print(f"[token] token.txt 가져오기 실패: {e}")
    return cfg


def save_config(cfg: dict) -> None:
    ensure_dirs()
    safe = default_config()
    for key in safe:
        if key in cfg:
            safe[key] = cfg[key]
    CONFIG_FILE.write_text(json.dumps(safe, ensure_ascii=False, indent=2), "utf-8")


def gh_headers(cfg: dict, auth: bool = True) -> dict:
    h = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": f"DuelsWikiEditor/{APP_VERSION}",
    }
    if auth and cfg.get("token"):
        h["Authorization"] = f"Bearer {cfg['token']}"
    return h


def http_json(url: str, *, cfg: dict, method="GET", data=None, auth=True, timeout=20):
    body = None if data is None else json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, method=method, headers=gh_headers(cfg, auth=auth))
    if body is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            return r.status, json.loads(raw.decode("utf-8")) if raw else None
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {"message": raw or str(e)}
        raise RuntimeError(f"GitHub {method} {e.code}: {payload.get('message', raw)}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"GitHub 연결 실패: {e.reason}") from e


def api_url(cfg: dict, suffix: str) -> str:
    owner = urllib.parse.quote(cfg["owner"], safe="")
    repo = urllib.parse.quote(cfg["repo"], safe="")
    return f"https://api.github.com/repos/{owner}/{repo}{suffix}"


def raw_url(cfg: dict, path: str) -> str:
    owner = urllib.parse.quote(cfg["owner"], safe="")
    repo = urllib.parse.quote(cfg["repo"], safe="")
    branch = urllib.parse.quote(cfg["branch"], safe="")
    qpath = "/".join(urllib.parse.quote(p, safe="") for p in path.split("/"))
    return f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{qpath}"


def gh_get_content(cfg: dict, path: str):
    qpath = "/".join(urllib.parse.quote(p, safe="") for p in path.split("/"))
    url = api_url(cfg, f"/contents/{qpath}?ref={urllib.parse.quote(cfg['branch'], safe='')}")
    try:
        _, data = http_json(url, cfg=cfg)
        return data
    except RuntimeError as e:
        if "404" in str(e):
            return None
        raise


def gh_read_text(cfg: dict, path: str):
    item = gh_get_content(cfg, path)
    if not item or isinstance(item, list):
        return None
    content = base64.b64decode(item.get("content", "")).decode("utf-8")
    return {"text": content, "sha": item.get("sha")}


def gh_list_dir(cfg: dict, path: str):
    item = gh_get_content(cfg, path)
    return item if isinstance(item, list) else []


def gh_put_file(cfg: dict, path: str, content_bytes: bytes, message: str, sha: str | None = None):
    """Create or update a repository file with stale-SHA conflict recovery.

    GitHub Contents API rejects an update when the blob SHA supplied by the
    client is no longer current.  This can happen when another editor request
    commits between our read and PUT.  Resolve the latest SHA and retry a few
    times so ordinary concurrent wiki saves do not surface as HTTP 409 errors.
    """
    qpath = "/".join(urllib.parse.quote(p, safe="") for p in path.split("/"))
    current_sha = sha

    for attempt in range(4):
        if not current_sha:
            existing = gh_get_content(cfg, path)
            if existing and not isinstance(existing, list):
                current_sha = existing.get("sha")

        payload = {
            "message": message,
            "content": base64.b64encode(content_bytes).decode("ascii"),
            "branch": cfg["branch"],
        }
        if current_sha:
            payload["sha"] = current_sha

        try:
            _, data = http_json(
                api_url(cfg, f"/contents/{qpath}"),
                cfg=cfg,
                method="PUT",
                data=payload,
            )
            return data
        except RuntimeError as e:
            msg = str(e)
            stale_sha = (
                ("409" in msg and ("expected" in msg.lower() or "sha" in msg.lower()))
                or ("422" in msg and "sha" in msg.lower())
            )
            if not stale_sha or attempt >= 3:
                raise

            # The branch/file changed after our previous read.  Always discard
            # the stale SHA and resolve the current blob before retrying.
            time.sleep(0.12 * (attempt + 1))
            existing = gh_get_content(cfg, path)
            current_sha = (
                existing.get("sha")
                if existing and not isinstance(existing, list)
                else None
            )

    raise RuntimeError(f"GitHub file update failed after retries: {path}")


def gh_delete_file(cfg: dict, path: str, sha: str, message: str):
    """Delete a repository file, refreshing its SHA when GitHub reports 409."""
    qpath = "/".join(urllib.parse.quote(p, safe="") for p in path.split("/"))
    current_sha = sha

    for attempt in range(4):
        if not current_sha:
            existing = gh_get_content(cfg, path)
            if not existing or isinstance(existing, list):
                return None
            current_sha = existing.get("sha")

        payload = {"message": message, "sha": current_sha, "branch": cfg["branch"]}
        try:
            _, data = http_json(
                api_url(cfg, f"/contents/{qpath}"),
                cfg=cfg,
                method="DELETE",
                data=payload,
            )
            return data
        except RuntimeError as e:
            msg = str(e)
            if "404" in msg:
                return None
            stale_sha = "409" in msg and ("expected" in msg.lower() or "sha" in msg.lower())
            if not stale_sha or attempt >= 3:
                raise
            time.sleep(0.12 * (attempt + 1))
            existing = gh_get_content(cfg, path)
            if not existing or isinstance(existing, list):
                return None
            current_sha = existing.get("sha")

    raise RuntimeError(f"GitHub file delete failed after retries: {path}")

def safe_slug(value: str) -> str:
    value = re.sub(r"[\\/:*?\"<>|#%]", "-", value.strip())
    value = re.sub(r"\s+", " ", value).strip(" .")
    return value


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S%z")


def wiki_categories(cfg: dict):
    path = f"{cfg['data_root']}/categories.json"
    item = gh_read_text(cfg, path)
    if item:
        try:
            cats = json.loads(item["text"])
            if isinstance(cats, dict):
                cats = cats.get("categories", [])
        except Exception:
            cats = []
    else:
        cats = []
    if not any(c.get("id") == UNCAT_ID for c in cats):
        cats.append({"id": UNCAT_ID, "name": "미분류", "slug": UNCAT_SLUG, "system": True, "deletable": False, "hasInfo": False})
    return cats


def save_categories(cfg: dict, categories: list, message: str):
    path = f"{cfg['data_root']}/categories.json"
    current = gh_read_text(cfg, path)
    gh_put_file(cfg, path, json.dumps(categories, ensure_ascii=False, indent=2).encode(), message, current["sha"] if current else None)


def blank_content():
    return {
        "type": "wiki-sections-v3",
        "introHtml": "<p></p>",
        "sections": [
            {"id": f"sec_{uuid.uuid4().hex}", "title": "개요", "contentHtml": "<p></p>", "children": []}
        ],
    }



def get_root_doc(cfg: dict):
    path = f"{cfg['data_root']}/_root.json"
    item = gh_read_text(cfg, path)
    if item:
        try:
            return json.loads(item["text"]), path, item["sha"]
        except Exception:
            pass
    doc = {
        "id": "root", "kind": "root", "title": "Duels Wiki", "slug": "_root",
        "content": blank_content(), "createdAt": now_iso(), "updatedAt": now_iso(),
    }
    return doc, path, None


def update_root_doc(cfg: dict, title: str, content: dict):
    doc, path, sha = get_root_doc(cfg)
    doc["title"] = title.strip() or "Duels Wiki"
    doc["content"] = content or blank_content()
    doc["updatedAt"] = now_iso()
    if not doc.get("createdAt"):
        doc["createdAt"] = now_iso()
    gh_put_file(cfg, path, json.dumps(doc, ensure_ascii=False, indent=2).encode(), "Update Duels Wiki root document", sha)
    return doc

def create_category(cfg: dict, name: str):
    name = name.strip()
    slug = safe_slug(name)
    if not slug or slug in {UNCAT_SLUG, "정보", "_info"}:
        raise RuntimeError("사용할 수 없는 카테고리 이름입니다.")
    cats = wiki_categories(cfg)
    if any(c.get("slug") == slug for c in cats):
        raise RuntimeError("이미 존재하는 카테고리입니다.")
    category = {"id": f"cat_{uuid.uuid4().hex}", "name": name, "slug": slug, "deletable": True, "hasInfo": True}
    doc = {
        "id": f"doc_{uuid.uuid4().hex}", "kind": "category-info", "title": name, "slug": "_info",
        "categoryId": category["id"], "categorySlug": slug, "content": blank_content(),
        "createdAt": now_iso(), "updatedAt": now_iso(),
    }
    info_path = f"{cfg['data_root']}/{slug}/_info.json"
    gh_put_file(cfg, info_path, json.dumps(doc, ensure_ascii=False, indent=2).encode(), f"Create category: {name}")
    save_categories(cfg, [*cats, category], f"Register category: {name}")
    return category


def get_doc(cfg: dict, category: str, doc_slug: str | None):
    path = f"{cfg['data_root']}/{category}/{'_info.json' if not doc_slug else doc_slug + '.json'}"
    item = gh_read_text(cfg, path)
    if not item:
        return None, path, None
    return json.loads(item["text"]), path, item["sha"]


def build_index(cfg: dict):
    cats = wiki_categories(cfg)
    out = []
    for c in cats:
        docs = []
        for ent in gh_list_dir(cfg, f"{cfg['data_root']}/{c['slug']}"):
            name = ent.get("name", "")
            if ent.get("type") != "file" or not name.endswith(".json") or name == "_info.json":
                continue
            try:
                d = gh_read_text(cfg, f"{cfg['data_root']}/{c['slug']}/{name}")
                if d:
                    j = json.loads(d["text"])
                    docs.append({"id": j.get("id"), "title": j.get("title", name[:-5]), "slug": j.get("slug", name[:-5])})
            except Exception:
                continue
        docs.sort(key=lambda x: x["title"])
        out.append({**c, "documents": docs})
    out.sort(key=lambda c: (1 if c.get("id") == UNCAT_ID or c.get("slug") == UNCAT_SLUG else 0, c.get("name", "")))
    return {"categories": out}


def create_document(cfg: dict, category: str, title: str, content: dict):
    cats = wiki_categories(cfg)
    c = next((x for x in cats if x.get("slug") == category), None)
    if not c:
        raise RuntimeError("카테고리를 찾을 수 없습니다.")
    slug = safe_slug(title)
    if not slug or slug in {"정보", "_info"}:
        raise RuntimeError("사용할 수 없는 문서 제목입니다.")
    if get_doc(cfg, category, slug)[0]:
        raise RuntimeError("같은 이름의 문서가 이미 존재합니다.")
    doc = {
        "id": f"doc_{uuid.uuid4().hex}", "kind": "document", "title": title, "slug": slug,
        "categoryId": c["id"], "categorySlug": category, "content": content,
        "createdAt": now_iso(), "updatedAt": now_iso(),
    }
    path = f"{cfg['data_root']}/{category}/{slug}.json"
    gh_put_file(cfg, path, json.dumps(doc, ensure_ascii=False, indent=2).encode(), f"Create document: {title}")
    return doc


def duplicate_document(cfg: dict, source_category: str, source_doc_slug: str, next_category: str, title: str):
    source, _, _ = get_doc(cfg, source_category, source_doc_slug)
    if not source or source.get("kind") != "document":
        raise RuntimeError("복제할 문서를 찾을 수 없습니다.")
    # Round-trip through JSON so the copy never shares mutable nested objects.
    content = json.loads(json.dumps(source.get("content") or blank_content(), ensure_ascii=False))
    return create_document(cfg, next_category or source_category, title, content)


def update_document(cfg: dict, category: str, doc_slug: str | None, title: str, next_category: str, content: dict):
    doc, old_path, sha = get_doc(cfg, category, doc_slug)
    if not doc:
        raise RuntimeError("문서를 찾을 수 없습니다.")
    if doc.get("kind") == "category-info":
        doc["content"] = content
        doc["updatedAt"] = now_iso()
        gh_put_file(cfg, old_path, json.dumps(doc, ensure_ascii=False, indent=2).encode(), f"Update category info: {doc.get('title', category)}", sha)
        return doc

    cats = wiki_categories(cfg)
    c = next((x for x in cats if x.get("slug") == next_category), None)
    if not c:
        raise RuntimeError("대상 카테고리를 찾을 수 없습니다.")
    next_title = title.strip() or doc.get("title", "")
    next_slug = safe_slug(next_title)
    if not next_slug or next_slug in {"정보", "_info"}:
        raise RuntimeError("사용할 수 없는 문서 제목입니다.")
    new_path = f"{cfg['data_root']}/{next_category}/{next_slug}.json"
    doc.update({
        "title": next_title, "slug": next_slug, "categoryId": c["id"], "categorySlug": next_category,
        "content": content, "updatedAt": now_iso(),
    })
    raw = json.dumps(doc, ensure_ascii=False, indent=2).encode()
    if new_path == old_path:
        gh_put_file(cfg, old_path, raw, f"Update document: {next_title}", sha)
    else:
        if gh_read_text(cfg, new_path):
            raise RuntimeError("대상 위치에 같은 이름의 문서가 이미 존재합니다.")
        gh_put_file(cfg, new_path, raw, f"Move document: {next_title}")
        gh_delete_file(cfg, old_path, sha, f"Remove old document path: {doc.get('title', next_title)}")
    return doc


def delete_document(cfg: dict, category: str, doc_slug: str | None):
    if not doc_slug:
        return delete_category(cfg, category)
    doc, path, sha = get_doc(cfg, category, doc_slug)
    if not doc:
        raise RuntimeError("문서를 찾을 수 없습니다.")
    gh_delete_file(cfg, path, sha, f"Delete document: {doc.get('title', doc_slug)}")


def delete_category(cfg: dict, category_slug: str):
    if category_slug == UNCAT_SLUG:
        raise RuntimeError("미분류 카테고리는 삭제할 수 없습니다.")
    cats = wiki_categories(cfg)
    cat = next((c for c in cats if c.get("slug") == category_slug), None)
    if not cat:
        raise RuntimeError("카테고리를 찾을 수 없습니다.")
    # Move children first. Deliberately uses ordinary content API for robustness.
    for ent in gh_list_dir(cfg, f"{cfg['data_root']}/{category_slug}"):
        name = ent.get("name", "")
        if ent.get("type") != "file" or not name.endswith(".json") or name == "_info.json":
            continue
        old_path = f"{cfg['data_root']}/{category_slug}/{name}"
        old = gh_read_text(cfg, old_path)
        if not old:
            continue
        doc = json.loads(old["text"])
        new_path = f"{cfg['data_root']}/{UNCAT_SLUG}/{name}"
        if gh_read_text(cfg, new_path):
            raise RuntimeError(f"미분류에 같은 문서가 이미 있습니다: {name[:-5]}")
        doc["categoryId"] = UNCAT_ID
        doc["categorySlug"] = UNCAT_SLUG
        doc["updatedAt"] = now_iso()
        gh_put_file(cfg, new_path, json.dumps(doc, ensure_ascii=False, indent=2).encode(), f"Move to 미분류: {doc.get('title', name[:-5])}")
        gh_delete_file(cfg, old_path, old["sha"], f"Remove from deleted category: {doc.get('title', name[:-5])}")
    info = gh_read_text(cfg, f"{cfg['data_root']}/{category_slug}/_info.json")
    if info:
        gh_delete_file(cfg, f"{cfg['data_root']}/{category_slug}/_info.json", info["sha"], f"Delete category info: {cat.get('name', category_slug)}")
    save_categories(cfg, [c for c in cats if c.get("slug") != category_slug], f"Delete category: {cat.get('name', category_slug)}")


def upload_image(cfg: dict, filename: str, data_url: str):
    ext = Path(filename).suffix.lower()
    if ext not in {".png", ".jpg", ".jpeg"}:
        raise RuntimeError("PNG/JPG 파일만 업로드할 수 있습니다.")
    m = re.match(r"^data:image/(png|jpeg);base64,(.+)$", data_url, re.I | re.S)
    if not m:
        raise RuntimeError("올바른 PNG/JPG 이미지 데이터가 아닙니다.")
    raw = base64.b64decode(m.group(2))
    if len(raw) > 15 * 1024 * 1024:
        raise RuntimeError("이미지는 15MB 이하만 업로드할 수 있습니다.")
    safe_name = re.sub(r"[^0-9A-Za-z가-힣._-]+", "-", Path(filename).name)
    final_name = f"{int(time.time())}-{uuid.uuid4().hex[:8]}-{safe_name}"
    path = f"{cfg['media_root']}/images/{final_name}"
    gh_put_file(cfg, path, raw, f"Upload image: {final_name}")
    return {"path": path, "src": f"/__media__/{urllib.parse.quote(path)}"}


def history(cfg: dict, path: str):
    q = urllib.parse.urlencode({"path": path, "sha": cfg["branch"], "per_page": 50})
    _, rows = http_json(api_url(cfg, f"/commits?{q}"), cfg=cfg)
    out = []
    for x in rows or []:
        c = x.get("commit", {})
        out.append({
            "sha": x.get("sha", "")[:12],
            "fullSha": x.get("sha", ""),
            "message": c.get("message", ""),
            "date": c.get("author", {}).get("date", ""),
            "author": c.get("author", {}).get("name", ""),
        })
    return out


def _decode_content_item(item: dict | None) -> bytes | None:
    if not item or isinstance(item, list):
        return None
    content = item.get("content", "")
    if not content:
        return b""
    return base64.b64decode(content)


def _read_cached_editor_version() -> str:
    try:
        data = json.loads((CACHE_DIR / "version.json").read_text("utf-8"))
        return str(data.get("version", "unknown"))
    except Exception:
        return "unknown"


def fetch_editor_assets(cfg: dict) -> tuple[bool, str]:
    """Download the editor atomically from the current GitHub branch.

    GitHub's Contents API is the source of truth.  Older launchers preferred
    raw.githubusercontent.com, whose CDN could occasionally return a stale
    editor and overwrite a newer local cache.  Fetch every asset from the
    Contents API first, validate version.json, then replace the cache only
    after all files have arrived successfully.
    """
    ensure_dirs()
    temp_dir = APP_HOME / "editor-cache-next"
    try:
        if temp_dir.exists():
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        temp_dir.mkdir(parents=True, exist_ok=True)

        downloaded: dict[str, bytes] = {}
        for name in EDITOR_FILES:
            item = gh_get_content(cfg, f"editor/{name}")
            data = _decode_content_item(item)
            if data is None:
                raise RuntimeError(f"editor/{name}을 GitHub Contents API에서 찾을 수 없습니다.")
            downloaded[name] = data

        try:
            remote_meta = json.loads(downloaded["version.json"].decode("utf-8"))
            remote_version = str(remote_meta.get("version", "unknown"))
        except Exception as e:
            raise RuntimeError(f"editor/version.json이 올바르지 않습니다: {e}") from e

        # Refuse to silently replace the cache with an unexpectedly old UI.
        # This also makes a failed/partial Git push obvious to the user.
        def version_key(v: str):
            parts = []
            for x in re.findall(r"\d+", v):
                parts.append(int(x))
            return tuple(parts or [0])

        cached_version = _read_cached_editor_version()
        if cached_version != "unknown" and version_key(remote_version) < version_key(cached_version):
            raise RuntimeError(
                f"원격 Editor {remote_version}가 로컬 캐시 {cached_version}보다 오래되었습니다. "
                "git_sync 결과와 GitHub의 editor/version.json을 확인해주세요."
            )

        for name, data in downloaded.items():
            (temp_dir / name).write_bytes(data)

        # Replace only after every file has been downloaded and validated.
        for name in EDITOR_FILES:
            (CACHE_DIR / name).write_bytes((temp_dir / name).read_bytes())

        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
        return True, f"GitHub Editor {remote_version}를 불러왔습니다. (branch: {cfg['branch']})"
    except Exception as e:
        try:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass
        cached = _read_cached_editor_version()
        if all((CACHE_DIR / name).exists() for name in ("index.html", "editor.css", "editor.js")):
            return False, f"최신 UI 확인 실패. 캐시 Editor {cached}를 사용합니다: {e}"
        return False, f"편집기 UI를 GitHub에서 가져오지 못했습니다: {e}"


class Handler(BaseHTTPRequestHandler):
    server_version = f"DuelsWikiEditor/{APP_VERSION}"

    def log_message(self, fmt, *args):
        print("[editor]", fmt % args)

    @property
    def cfg(self):
        return self.server.cfg

    def send_json(self, obj, status=200):
        data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def read_json(self):
        n = int(self.headers.get("Content-Length", "0") or 0)
        raw = self.rfile.read(n) if n else b"{}"
        return json.loads(raw.decode("utf-8"))

    def do_GET(self):
        try:
            u = urllib.parse.urlparse(self.path)
            q = urllib.parse.parse_qs(u.query)
            if u.path == "/api/config":
                self.send_json({
                    "owner": self.cfg["owner"], "repo": self.cfg["repo"], "branch": self.cfg["branch"],
                    "data_root": self.cfg["data_root"], "media_root": self.cfg["media_root"],
                    "tokenConfigured": bool(self.cfg.get("token")), "launcherVersion": APP_VERSION,
                }); return
            if u.path == "/api/duels-data":
                force=q.get("refresh", ["0"])[0] in {"1", "true", "yes"}
                self.send_json(fetch_duels_catalog(force=force)); return
            if u.path == "/api/index":
                self.send_json(build_index(self.cfg)); return
            if u.path == "/api/root":
                data, path, _ = get_root_doc(self.cfg)
                self.send_json({"document": data, "path": path}); return
            if u.path == "/api/document":
                category = q.get("category", [""])[0]
                doc = q.get("doc", [None])[0]
                data, path, _ = get_doc(self.cfg, category, doc)
                if not data:
                    self.send_json({"error": "문서를 찾을 수 없습니다."}, 404)
                else:
                    self.send_json({"document": data, "path": path})
                return
            if u.path == "/api/history":
                path = q.get("path", [""])[0]
                self.send_json({"history": history(self.cfg, path)}); return
            if u.path.startswith("/__media__/"):
                path = urllib.parse.unquote(u.path[len("/__media__/"):])
                item = gh_get_content(self.cfg, path)
                if not item or isinstance(item, list):
                    self.send_error(404); return
                raw = base64.b64decode(item.get("content", ""))
                ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
                self.send_response(200); self.send_header("Content-Type", ctype); self.send_header("Content-Length", str(len(raw))); self.send_header("Cache-Control", "private, max-age=120"); self.end_headers(); self.wfile.write(raw); return
            self.serve_static(u.path)
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def do_POST(self):
        try:
            u = urllib.parse.urlparse(self.path)
            body = self.read_json()
            if u.path == "/api/token":
                # Leaving the PAT field blank means "keep the existing token".
                # This also prevents merely editing owner/repo/branch from wiping auth.
                if "token" in body:
                    self.cfg["token"] = str(body.get("token", "")).strip()
                for k in ("owner", "repo", "branch", "data_root", "media_root"):
                    if body.get(k): self.cfg[k] = body[k].strip()
                save_config(self.cfg)
                self.send_json({"ok": True}); return
            if not self.cfg.get("token"):
                self.send_json({"error": "GitHub Token을 먼저 설정해주세요."}, 401); return
            if u.path == "/api/root/update":
                self.send_json({"document": update_root_doc(self.cfg, body.get("title", "Duels Wiki"), body.get("content") or blank_content())}); return
            if u.path == "/api/category":
                self.send_json({"category": create_category(self.cfg, body.get("name", ""))}); return
            if u.path == "/api/document/create":
                self.send_json({"document": create_document(self.cfg, body.get("category", ""), body.get("title", ""), body.get("content") or blank_content())}); return
            if u.path == "/api/document/update":
                self.send_json({"document": update_document(self.cfg, body.get("category", ""), body.get("doc"), body.get("title", ""), body.get("nextCategory") or body.get("category", ""), body.get("content") or blank_content())}); return
            if u.path == "/api/document/duplicate":
                self.send_json({"document": duplicate_document(self.cfg, body.get("category", ""), body.get("doc", ""), body.get("nextCategory") or body.get("category", ""), body.get("title", ""))}); return
            if u.path == "/api/media":
                self.send_json(upload_image(self.cfg, body.get("filename", "image.png"), body.get("data", ""))); return
            self.send_json({"error": "지원하지 않는 요청입니다."}, 404)
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def do_DELETE(self):
        try:
            if not self.cfg.get("token"):
                self.send_json({"error": "GitHub Token을 먼저 설정해주세요."}, 401); return
            u = urllib.parse.urlparse(self.path)
            q = urllib.parse.parse_qs(u.query)
            if u.path == "/api/document":
                category = q.get("category", [""])[0]
                doc = q.get("doc", [None])[0]
                delete_document(self.cfg, category, doc)
                self.send_json({"ok": True}); return
            self.send_json({"error": "지원하지 않는 요청입니다."}, 404)
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def serve_static(self, path: str):
        if path in {"", "/"}:
            path = "/index.html"
        name = path.lstrip("/")
        if name not in {"index.html", "editor.css", "editor.js"}:
            self.send_error(404); return
        file = CACHE_DIR / name
        if not file.exists():
            self.send_error(404, "Editor UI not cached"); return
        raw = file.read_bytes()
        ctype = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8"}.get(file.suffix, "application/octet-stream")
        self.send_response(200); self.send_header("Content-Type", ctype); self.send_header("Content-Length", str(len(raw))); self.send_header("Cache-Control", "no-store"); self.end_headers(); self.wfile.write(raw)


def main():
    cfg = load_config()
    ok, message = fetch_editor_assets(cfg)
    print(message)
    if not (CACHE_DIR / "index.html").exists():
        print("\n먼저 duels_wiki 저장소에 editor 폴더의 파일을 업로드한 뒤 다시 실행해주세요.")
        input("Enter 키를 누르면 종료합니다...")
        return
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    server.cfg = cfg
    host, port = server.server_address
    url = f"http://{host}:{port}/"
    print(f"Duels Wiki Editor {APP_VERSION}")
    print(f"편집기: {url}")
    print("종료하려면 이 창에서 Ctrl+C를 누르세요.")
    threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n종료합니다.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
