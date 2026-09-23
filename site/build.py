#!/usr/bin/env python3
from __future__ import annotations
import html, json, re, shutil
from pathlib import Path
from urllib.parse import quote, unquote

ROOT=Path(__file__).resolve().parents[1]
WIKI=ROOT/'wiki'; MEDIA=ROOT/'media'; OUT=ROOT/'site'/'dist'
UNCAT='미분류'

CSS='''
*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:"SUIT Variable","SUIT","Pretendard Variable","Pretendard","Wanted Sans","Noto Sans KR","Apple SD Gothic Neo","Segoe UI",Arial,sans-serif;color:#e0e0e0;background:#0a0a0c;letter-spacing:-.018em}body{line-height:1.6}.top{height:58px;background:#090b0f;border-bottom:1px solid #1f3345;display:flex;align-items:center;padding:0 20px;position:sticky;top:0;z-index:50;box-shadow:0 6px 22px #0008}.top a{color:#44aaff;text-decoration:none;font-weight:650;font-size:20px;letter-spacing:.12em;text-transform:uppercase;text-shadow:0 0 12px #4af5}.nav-toggle{display:none;margin-right:10px;border:1px solid #2a4a6a;background:transparent;color:#adf;border-radius:2px;padding:6px 9px;font-size:18px;cursor:pointer}.layout{display:grid;grid-template-columns:292px minmax(0,1fr);min-height:calc(100vh - 58px)}.sidebar{background:linear-gradient(180deg,#0c1118,#080c11);border-right:1px solid #203548;padding:18px 14px 40px;position:sticky;top:58px;height:calc(100vh - 58px);overflow:auto}.side-root{display:block;padding:9px 10px;color:#9fc8e6;text-decoration:none;font-weight:650;margin-bottom:9px;letter-spacing:.08em;border-left:2px solid transparent}.side-root:hover,.side-link:hover{background:#0f1b27;color:#dff;border-left-color:#315b7c}.side-category{margin:9px 0 3px}.side-category>a,.side-category>span{display:block;padding:7px 10px;color:#a9bed0;text-decoration:none;font-weight:650;border-left:2px solid transparent}.side-category>a:hover{background:#0f1b27;color:#dff;border-left-color:#315b7c}.side-docs{margin:1px 0 8px;padding-left:10px;border-left:1px solid #1d3042}.side-link{display:block;padding:6px 10px;color:#718395;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-left:2px solid transparent;font-size:13px}.side-link.active,.side-root.active,.side-category>a.active{background:#102130;color:#dff;border-left-color:#49b8ff;text-shadow:0 0 8px #4af4}.content{min-width:0;background:radial-gradient(circle at 72% 0,#10223755,transparent 33%),#0a0a0c}.page{max-width:980px;margin:30px auto 80px;background:linear-gradient(180deg,#0d1219,#0a0f15);border:1px solid #29435c;padding:30px 38px;box-shadow:0 0 0 1px #09111b,0 0 24px #249cff14}h1{font-size:33px;margin:0 0 16px;color:#dceeff;letter-spacing:.035em;border-bottom:1px solid #1e3447;padding-bottom:14px}.intro{margin-bottom:20px;color:#b9c5d0}.toc{border:1px solid #223b51;background:linear-gradient(180deg,#0b141d,#09111a);padding:14px 18px;margin:22px 0}.toc-title{font-weight:650;margin-bottom:8px;color:#58bfff;font-size:11px;letter-spacing:.18em;text-transform:uppercase}.toc-line{display:flex;align-items:baseline;gap:9px;padding-left:calc(var(--toc-depth,0) * 18px);margin:5px 0}.toc a,.body a,.section-title a{color:#65c6ff;text-decoration:none}.toc a:hover,.body a:hover{text-decoration:underline;text-shadow:0 0 8px #4af8}.toc-number{display:inline-block;flex:0 0 auto;min-width:0;white-space:nowrap}.toc-text{min-width:0;color:#b7c2cc}.section{margin:28px 0}.section-title{border-bottom:1px solid #1e3447;padding-bottom:8px;margin:0 0 12px;line-height:1.35;color:#d9e7f3}.depth-1>.section-title{font-size:25px}.depth-2>.section-title{font-size:21px}.depth-3>.section-title{font-size:18px}.num{margin-right:7px;color:#58bfff}.body{color:#b7c2cc}.body p{margin:.42em 0}.body img{max-width:100%;height:auto}.body ul{list-style:none;padding-left:1.55em;margin:.45em 0}.body ul>li{position:relative}.body ul>li::before{content:'·';position:absolute;left:-1.05em;top:0;color:#c9dbe9;font-weight:800}.body ol{list-style-type:decimal;padding-left:2.05em;margin:.45em 0}.body ol>li::marker{color:#c9dbe9;font-variant-numeric:tabular-nums}.body li{padding-left:.12em;margin:.12em 0}.body li>ul,.body li>ol{margin:.14em 0}.body blockquote{border-left:2px solid #315b7c;margin:.7em 0;padding:.35em .9em;color:#91a1b2;background:#09131d}.muted{color:#667788}
@media(max-width:900px){.layout{grid-template-columns:240px minmax(0,1fr)}.page{margin:18px 14px 60px}}
.footnote-ref{color:#65c6ff;text-decoration:none;font-weight:700;font-size:.82em;white-space:nowrap}.footnote-ref:hover{text-decoration:underline;text-shadow:0 0 8px #4af8}.footnotes{margin:42px 0 8px;padding-top:16px;border-top:1px solid #29435c}.footnotes-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}.footnotes-head h2{margin:0;color:#d9e7f3;font-size:20px;line-height:1.3}.footnotes-kicker{font-size:9px;letter-spacing:.18em;color:#4f7895;border:1px solid #28465f;padding:2px 5px}.footnote-row{display:grid;grid-template-columns:30px minmax(0,1fr);gap:4px;align-items:start;padding:8px 0;border-bottom:1px solid #162a3b}.footnote-number{color:#68c7ff;font-size:12px;font-weight:700;padding-top:4px;font-variant-numeric:tabular-nums}.footnote-content>p:first-child{margin-top:0}.footnote-content>p:last-child{margin-bottom:0}@media(max-width:720px){.nav-toggle{display:inline-block;color:#adf}.layout{display:block}.sidebar{position:fixed;left:0;top:58px;bottom:0;width:min(86vw,300px);height:auto;z-index:45;transform:translateX(-102%);transition:transform .18s ease;box-shadow:8px 0 24px #000b}.sidebar.open{transform:translateX(0)}.page{margin:12px 8px 50px;padding:20px 16px}h1{font-size:27px}.top{padding:0 10px}.top a{font-size:17px}}
@media(max-width:720px){html,body{max-width:100%;overflow-x:hidden}.content{min-width:0}.page{max-width:calc(100vw - 16px);overflow-wrap:anywhere}.body img{max-width:100%!important;height:auto!important}.toc{overflow-wrap:anywhere}}
@media(max-width:420px){.page{margin:8px 4px 44px;padding:18px 12px}.top{padding:0 7px}.top a{font-size:15px}h1{font-size:24px}}
.footnote-ref-active{outline:1px solid #4aaeff88;outline-offset:2px;border-radius:2px;background:#16314a66}.footnote-popover{position:fixed;z-index:10020;width:min(380px,calc(100vw - 24px));max-height:min(52vh,360px);overflow:auto;padding:12px 13px 11px;border:1px solid #315b7c;background:linear-gradient(180deg,#0d1721,#091018);box-shadow:0 14px 38px #000b,0 0 18px #249cff24;color:#c4d2de}.footnote-popover.hidden{display:none}.footnote-popover-head{display:flex;align-items:center;gap:8px;padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid #20384d}.footnote-popover-label{font-size:11px;font-weight:750;letter-spacing:.05em;color:#68c7ff}.footnote-popover-close{margin-left:auto;width:26px;height:24px;padding:0;border:0;background:transparent;color:#7890a4;font-size:19px;line-height:1;cursor:pointer}.footnote-popover-close:hover{color:#dff}.footnote-popover-body{font-size:13px;line-height:1.55;color:#b9c7d3;overflow-wrap:anywhere}.footnote-popover-body>p:first-child{margin-top:0}.footnote-popover-body>p:last-child{margin-bottom:0}.footnote-popover-jump{display:none;width:100%;margin-top:10px;padding:8px 10px;border:1px solid #315b7c;background:#102438;color:#9fd7ff;cursor:pointer}.footnote-popover-jump:hover{background:#163149}.footnote-popover img{max-width:100%;height:auto}@media(hover:none),(pointer:coarse){.footnote-popover{width:auto;left:12px!important;right:12px!important;top:auto!important;bottom:12px!important;max-height:42vh;padding:13px 14px calc(12px + env(safe-area-inset-bottom));border-color:#37688e;box-shadow:0 -10px 36px #000c,0 0 18px #249cff24}.footnote-popover-jump{display:block}.footnote-ref:hover{text-decoration:none;text-shadow:none}}

.duels-character-card{--duels-card-color:#44aaff;--duels-card-width:138px;--duels-card-height:222px;position:relative;isolation:isolate;display:inline-block;vertical-align:top;width:min(var(--duels-card-width),100%);height:var(--duels-card-height);margin:6px 10px 6px 0;overflow:hidden;border:2px solid color-mix(in srgb,var(--duels-card-color) 62%,#34485b);border-radius:4px;background:#0d1015;box-shadow:0 0 8px color-mix(in srgb,var(--duels-card-color) 24%,transparent),inset 0 0 8px rgba(255,255,255,.025);cursor:default;user-select:none}.duels-character-card[data-align="left"]{display:inline-block;margin:6px 10px 6px 0}.duels-character-card[data-align="center"]{display:block;margin:6px auto}.duels-character-card[data-align="right"]{display:block;margin:6px 0 6px auto}.duels-character-card-image{position:absolute;inset:0;z-index:-2;background-repeat:no-repeat;background-size:cover;background-position:center center;filter:saturate(.88) brightness(.68) contrast(1.05)}.duels-character-card-image.empty{background:linear-gradient(145deg,#111b25,#081019)}.duels-character-card-shade{position:absolute;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(180deg,rgba(7,10,15,.03) 0%,rgba(7,10,15,.10) 42%,rgba(9,13,19,.58) 62%,rgba(10,14,20,.95) 78%,rgba(10,14,20,.99) 100%)}.duels-character-card[data-fade="none"] .duels-character-card-shade{display:none}.duels-character-card[data-fade="soft"] .duels-character-card-shade{background:linear-gradient(180deg,rgba(7,10,15,0) 0%,rgba(7,10,15,.03) 52%,rgba(9,13,19,.28) 72%,rgba(10,14,20,.62) 100%)}.duels-character-card[data-fade="strong"] .duels-character-card-shade{background:linear-gradient(180deg,rgba(7,10,15,.08) 0%,rgba(7,10,15,.22) 36%,rgba(9,13,19,.72) 58%,rgba(10,14,20,.98) 76%,#0a0e14 100%)}.duels-character-card-copy{position:absolute;left:9px;right:9px;bottom:9px;z-index:1;max-height:48%;overflow:hidden;color:#9aa9b6;font-size:11px;line-height:1.38;text-align:left;overflow-wrap:anywhere;word-break:keep-all;text-shadow:0 1px 2px #000}.duels-character-card-copy>div:first-child{color:#e0edf7;font-size:13px;font-weight:700;letter-spacing:.7px}.duels-character-card-copy>div+div{margin-top:3px}.duels-character-card>.duels-character-portrait{position:absolute!important;inset:0!important;z-index:-2!important;width:100%!important;height:100%!important;margin:0!important;border:0!important;border-radius:0!important;background:#091018!important}.duels-character-card>.duels-character-portrait img{width:100%!important;height:100%!important;max-width:none!important;object-fit:cover!important;object-position:center center!important;margin:0!important;border:0!important;border-radius:0!important}.duels-character-card>.duels-character-name{position:absolute!important;left:9px!important;right:9px!important;bottom:9px!important;width:auto!important;margin:0!important;color:#e0edf7!important;font-size:13px!important;font-weight:700!important;line-height:1.38!important;text-align:left!important;letter-spacing:.7px!important;white-space:normal!important}.duels-character-card>.duels-character-title,.duels-character-card>.duels-character-mini-stats,.duels-character-card>.duels-character-tooltip{display:none!important}.duels-description-box{--duels-box-color:#44aaff;position:relative;margin:6px 0;border:1px solid #2a4a6a;border-left:2px solid var(--duels-box-color);border-radius:3px;background:linear-gradient(180deg,#0d1520,#091019);box-shadow:0 8px 24px rgba(0,0,0,.34),0 0 12px color-mix(in srgb,var(--duels-box-color) 12%,transparent);color:#7a8998;font-size:11px;line-height:1.55;text-align:left}.duels-description-box-title{padding:8px 12px 7px;border-bottom:1px solid #1d3042;color:var(--duels-box-color);font-weight:700;letter-spacing:1.4px;text-shadow:0 0 8px color-mix(in srgb,var(--duels-box-color) 34%,transparent)}.duels-description-box-body{padding:10px 12px 11px;color:#7b8795;overflow-wrap:anywhere;word-break:keep-all}.duels-description-box-title:only-child{border-bottom:0}.duels-description-box-body:empty{display:none}
@media(max-width:720px){.duels-character-card{margin:5px 6px 5px 0}.duels-description-box{max-width:100%}}
@media(max-width:420px){.duels-character-card{max-width:100%}}.inline-linked-image{display:inline-block!important;width:auto!important;height:1.55em!important;max-width:8em!important;max-height:1.55em!important;margin:0 .14em;vertical-align:-.34em;object-fit:contain!important;border:0!important;border-radius:2px;background:transparent;box-shadow:none!important}.duels-table-component{--duels-table-base-width:400px;--duels-table-border:#2a4a6a;display:block;position:relative;width:max-content;min-width:min(var(--duels-table-base-width),100%);max-width:none;margin:6px 0}.duels-table-scroll{display:block;overflow:visible;max-width:none}.duels-table{border-collapse:separate;border-spacing:0;table-layout:auto;width:max-content;min-width:var(--duels-table-base-width);background:#091019;color:#b8c7d3;font-family:var(--font-ui);font-size:12px;line-height:1.35;border:1px solid var(--duels-table-border)}.duels-table td{box-sizing:border-box;height:29px;padding:5px 8px;border-right:1px solid #20384d;border-bottom:1px solid #20384d;vertical-align:middle;white-space:nowrap;overflow:visible;font-family:inherit;text-align:center}.duels-table tr:last-child td{border-bottom:0}.duels-table td:last-child{border-right:0}.duels-table-component.fit-width{width:100%;min-width:0;max-width:100%}.duels-table-component.fit-width .duels-table-scroll{width:100%;max-width:100%;overflow:visible}.duels-table-component.fit-width .duels-table{table-layout:fixed;width:100%;min-width:0;max-width:100%}.duels-table-component.fit-width .duels-table td{min-width:0!important;white-space:normal;overflow-wrap:anywhere}@media(max-width:720px){.duels-table-component{max-width:100%}.duels-table-scroll{max-width:100%;overflow-x:auto}.duels-table-component.fit-width .duels-table-scroll{overflow:visible}}
*{scrollbar-width:thin;scrollbar-color:#29435c #080d13}*::-webkit-scrollbar{width:8px;height:8px}*::-webkit-scrollbar-track{background:#080d13}*::-webkit-scrollbar-thumb{background:#162b3b;border:1px solid #29435c;border-radius:2px}*::-webkit-scrollbar-thumb:hover{background:#21415a;border-color:#4af}*::-webkit-scrollbar-corner{background:#080d13}
'''

def esc(s): return html.escape(str(s or ''))
def load_json(p,default=None):
    try:return json.loads(p.read_text('utf-8'))
    except:return default

def old_node(n):
    if not n:return''
    if n.get('type')=='text':
        t=esc(n.get('text',''))
        for m in n.get('marks',[]):
            typ=m.get('type');a=m.get('attrs') or {}
            if typ=='bold':t=f'<strong>{t}</strong>'
            elif typ=='italic':t=f'<em>{t}</em>'
            elif typ=='strike':t=f'<s>{t}</s>'
            elif typ=='link':t=f'<a href="{esc(a.get("href","#"))}">{t}</a>'
            elif typ=='textStyle':
                st=[]
                if a.get('color'):st.append(f'color:{a["color"]}')
                if a.get('fontSize'):st.append(f'font-size:{a["fontSize"]}')
                if st:t=f'<span style="{";".join(st)}">{t}</span>'
        return t
    ch=''.join(old_node(x) for x in n.get('content',[]));typ=n.get('type')
    if typ=='doc':return ch
    if typ=='paragraph':return f'<p>{ch or "<br>"}</p>'
    if typ=='hardBreak':return'<br>'
    if typ=='bulletList':return f'<ul>{ch}</ul>'
    if typ=='orderedList':return f'<ol>{ch}</ol>'
    if typ=='listItem':return f'<li>{ch}</li>'
    if typ=='blockquote':return f'<blockquote>{ch}</blockquote>'
    if typ=='image':
        a=n.get('attrs') or {};st=[]
        if a.get('width'):st.append(f'width:{int(a["width"])}px')
        if a.get('height'):st.append(f'height:{int(a["height"])}px')
        if a.get('rotation'):st.append(f'transform:rotate({float(a["rotation"])}deg)')
        return f'<img src="{esc(a.get("src",""))}" style="{";".join(st)}">'
    return ch

def norm(c):
    if isinstance(c,dict) and c.get('type')=='wiki-sections-v3':
        c=dict(c);c['footnotes']=c.get('footnotes') if isinstance(c.get('footnotes'),list) else [];return c
    if isinstance(c,dict) and c.get('type')=='wiki-sections':
        def cv(s):return {'id':s.get('id','sec'),'title':s.get('title','제목 없음'),'contentHtml':old_node(s.get('content') or {'type':'doc'}),'children':[cv(x) for x in s.get('children',[])]}
        return {'type':'wiki-sections-v3','introHtml':old_node(c.get('intro') or {'type':'doc'}),'sections':[cv(x) for x in c.get('sections',[])],'footnotes':[]}
    return {'type':'wiki-sections-v3','introHtml':old_node(c if isinstance(c,dict) else {'type':'doc'}),'sections':[],'footnotes':[]}

def anchor(i):return 'section-'+re.sub(r'[^A-Za-z0-9_-]','-',str(i))
def internal_href(cur_parts,target):
    # target semantic: wiki:/, wiki:/category, wiki:/category/doc
    x=target[6:] if target.startswith('wiki:/') else target
    if not x or x=='/':parts=[]
    else:parts=[unquote(p) for p in x.lstrip('/').split('/') if p]
    target_file=Path(*parts,'index.html') if parts else Path('index.html')
    cur_dir=Path(*cur_parts)
    import os
    return Path(os.path.relpath(target_file,cur_dir)).as_posix()

INLINE_IMAGE_RE=re.compile(r'`((?:https?://|/media/|/__media__/)[^`\s]+?\.(?:png|jpe?g|webp|gif|svg)(?:\?[^`\s]*)?)`',re.I)
def expand_inline_images(src):
    if not src:return ''
    parts=re.split(r'(<[^>]+>)',src)
    blocked=0
    out=[]
    for part in parts:
        if part.startswith('<'):
            low=part.lower()
            if re.match(r'<\s*(code|pre|script|style|textarea)\b',low):blocked+=1
            elif re.match(r'<\s*/\s*(code|pre|script|style|textarea)\s*>',low):blocked=max(0,blocked-1)
            out.append(part);continue
        if blocked:out.append(part);continue
        out.append(INLINE_IMAGE_RE.sub(lambda m:f'<img class="inline-linked-image" src="{html.escape(m.group(1),quote=True)}" alt="" loading="lazy">',part))
    return ''.join(out)

def rewrite_html(src,cur_parts):
    if not src:return''
    src=expand_inline_images(src)
    # Older editor versions stored a native title such as "각주 1" on footnote refs.
    # Strip only that generated title so the custom preview is the sole hover UI.
    src=re.sub(r'\s+title=(["\'])각주\s+\d+\1','',src)
    # local media
    src=re.sub(r'(?i)(src=["\'])/media/',lambda m:m.group(1)+('../'*len(cur_parts))+'media/',src)
    # semantic links
    def repl(m):return f'{m.group(1)}{internal_href(cur_parts,m.group(2))}{m.group(3)}'
    src=re.sub(r'(href=["\'])(wiki:/[^"\']*)(["\'])',repl,src)
    return src

def toc(sections,prefix='',depth=0):
    out=[]
    for i,s in enumerate(sections,1):
        n=f'{prefix}.{i}' if prefix else str(i)
        out.append(f'<div class="toc-line" style="--toc-depth:{depth}"><a class="toc-number" href="#{anchor(s.get("id"))}">{n}.</a><span class="toc-text">{esc(s.get("title","제목 없음"))}</span></div>')
        out.append(toc(s.get('children',[]),n,depth+1))
    return ''.join(out)
def sections_html(sections,cur_parts,self_href,prefix='',depth=1):
    out=[]
    for i,s in enumerate(sections,1):
        n=f'{prefix}.{i}' if prefix else str(i); d=min(depth,3)
        body=rewrite_html(s.get('contentHtml',''),cur_parts)
        out.append(f'<section class="section depth-{d}"><h2 id="{anchor(s.get("id"))}" class="section-title"><a class="num" href="{self_href}">{n}.</a>{esc(s.get("title","제목 없음"))}</h2><div class="body">{body}</div>{sections_html(s.get("children",[]),cur_parts,self_href,n,depth+1)}</section>')
    return ''.join(out)
def footnote_anchor(i):return 'footnote-'+re.sub(r'[^A-Za-z0-9_-]','-',str(i))
def footnotes_html(notes,cur_parts):
    if not notes:return ''
    out=['<section class="footnotes"><div class="footnotes-head"><span class="footnotes-kicker">NOTES</span><h2>각주</h2></div><div class="footnotes-list">']
    for i,f in enumerate(notes,1):
        out.append(f'<div class="footnote-row" id="{footnote_anchor(f.get("id","fn"))}"><span class="footnote-number">[{i}]</span><div class="footnote-content body">{rewrite_html(f.get("contentHtml",""),cur_parts)}</div></div>')
    out.append('</div></section>')
    return ''.join(out)

def sidebar_html(allcats,cur_parts):
    root_href=internal_href(cur_parts,'wiki:/')
    current='/'.join(cur_parts)
    out=[f'<a class="side-root {"active" if not cur_parts else ""}" href="{root_href}">Duels Wiki</a>']
    for c,docs in allcats:
        slug=c.get('slug',''); name=c.get('name',slug)
        cat_parts=[slug]
        active_cat=(cur_parts==cat_parts)
        out.append('<div class="side-category">')
        if c.get('hasInfo'):
            href=internal_href(cur_parts,'wiki:/'+slug)
            out.append(f'<a class="{"active" if active_cat else ""}" href="{href}">{esc(name)}</a>')
        else:
            out.append(f'<span>{esc(name)}</span>')
        if docs:
            out.append('<div class="side-docs">')
            for x in docs:
                dslug=x.get('slug',''); title=x.get('title',dslug)
                href=internal_href(cur_parts,'wiki:/'+slug+'/'+dslug)
                active=(cur_parts==[slug,dslug])
                out.append(f'<a class="side-link {"active" if active else ""}" href="{href}">{esc(title)}</a>')
            out.append('</div>')
        out.append('</div>')
    return ''.join(out)

FOOTNOTE_JS=r'''(function(){
var pop=null,active=null,hideTimer=0;
function touchMode(){return !window.matchMedia('(hover:hover) and (pointer:fine)').matches}
function ensure(){if(pop&&pop.isConnected)return pop;pop=document.createElement('div');pop.className='footnote-popover hidden';pop.setAttribute('role','tooltip');pop.innerHTML='<div class="footnote-popover-head"><span class="footnote-popover-label"></span><button type="button" class="footnote-popover-close" aria-label="닫기">×</button></div><div class="footnote-popover-body body"></div><button type="button" class="footnote-popover-jump">각주로 이동</button>';document.body.appendChild(pop);pop.addEventListener('mouseenter',function(){clearTimeout(hideTimer)});pop.addEventListener('mouseleave',function(){if(!touchMode())scheduleHide()});pop.querySelector('.footnote-popover-close').onclick=hide;pop.querySelector('.footnote-popover-jump').onclick=function(){if(active)jump(active)};return pop}
function target(a){var h=a&&a.getAttribute('href')||'';return h.indexOf('#footnote-')===0?document.getElementById(h.slice(1)):null}
function position(a){var p=ensure();if(touchMode()){p.style.left='12px';p.style.right='12px';p.style.top='auto';p.style.bottom='12px';p.style.width='auto';return}p.style.right='auto';p.style.bottom='auto';var r=a.getBoundingClientRect(),w=Math.min(380,window.innerWidth-24);p.style.width=w+'px';p.style.left=Math.min(Math.max(12,r.left),window.innerWidth-w-12)+'px';p.style.top='0px';var ph=p.offsetHeight||150,top=r.bottom+9;if(top+ph>window.innerHeight-12)top=Math.max(12,r.top-ph-9);p.style.top=top+'px'}
function show(a){var t=target(a);if(!t)return;clearTimeout(hideTimer);var p=ensure(),body=t.querySelector('.footnote-content'),n=(a.textContent||'').trim();p.querySelector('.footnote-popover-label').textContent=n;p.querySelector('.footnote-popover-body').innerHTML=body?body.innerHTML:'<p>내용이 없습니다.</p>';if(active)active.classList.remove('footnote-ref-active');active=a;a.classList.add('footnote-ref-active');p.classList.remove('hidden');position(a)}
function hide(){clearTimeout(hideTimer);if(pop)pop.classList.add('hidden');if(active)active.classList.remove('footnote-ref-active');active=null}
function scheduleHide(){clearTimeout(hideTimer);hideTimer=setTimeout(hide,130)}
function jump(a){var t=target(a);hide();if(t)t.scrollIntoView({behavior:'smooth',block:'center'})}
document.querySelectorAll('a[data-footnote-ref]').forEach(function(a){a.addEventListener('mouseenter',function(){if(!touchMode())show(a)});a.addEventListener('mouseleave',function(){if(!touchMode())scheduleHide()});a.addEventListener('click',function(e){var h=a.getAttribute('href')||'';if(h.indexOf('#footnote-')!==0)return;e.preventDefault();if(touchMode()){if(active===a&&pop&&!pop.classList.contains('hidden'))jump(a);else show(a)}else jump(a)})});
document.addEventListener('click',function(e){if(!touchMode()||!active)return;if(e.target.closest('.footnote-popover')||e.target.closest('a[data-footnote-ref]'))return;hide()},{capture:true});
})();'''

def shell(title,body,root_href,sidebar):
    return f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>{esc(title)} - Duels Wiki</title><style>{CSS}</style></head><body><header class="top"><button class="nav-toggle" id="navToggle" aria-label="문서 목록">☰</button><a href="{root_href}">Duels Wiki</a></header><div class="layout"><aside class="sidebar" id="wikiSidebar">{sidebar}</aside><div class="content">{body}</div></div><script>(function(){{var b=document.getElementById('navToggle'),s=document.getElementById('wikiSidebar');if(b&&s)b.addEventListener('click',function(){{s.classList.toggle('open')}});document.addEventListener('click',function(e){{if(window.innerWidth>720||!s.classList.contains('open'))return;if(e.target.closest('#wikiSidebar')||e.target.closest('#navToggle'))return;s.classList.remove('open')}})}})();</script><script>{FOOTNOTE_JS}</script></body></html>'''

def build():
    if OUT.exists():shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    if MEDIA.exists():shutil.copytree(MEDIA,OUT/'media',dirs_exist_ok=True)
    cats=load_json(WIKI/'categories.json',[]) or []
    if isinstance(cats,dict):cats=cats.get('categories',[])
    # 미분류는 편집기 전용이다. 정적 열람 사이트에는 카테고리/하위 문서 모두 노출·생성하지 않는다.
    cats=[c for c in cats if c.get('id')!='uncategorized' and c.get('slug')!=UNCAT and c.get('name')!=UNCAT]
    cats.sort(key=lambda c:str(c.get('name','')))
    allcats=[]
    for c in cats:
        folder=WIKI/c['slug'];docs=[]
        if folder.exists():
            for p in sorted(folder.glob('*.json')):
                if p.name=='_info.json':continue
                d=load_json(p,{}) or {};docs.append({'title':d.get('title',p.stem),'slug':d.get('slug',p.stem),'doc':d})
        allcats.append((c,docs))
    root_doc=load_json(WIKI/'_root.json') or {
        'id':'root','kind':'root','title':'Duels Wiki','slug':'_root',
        'content':{'type':'wiki-sections-v3','introHtml':'<p></p>','sections':[{'id':'root-overview','title':'개요','contentHtml':'<p></p>','children':[]}]}
    }
    write_doc(root_doc,[],allcats)
    for c,docs in allcats:
        if c.get('hasInfo'):
            p=WIKI/c['slug']/'_info.json';d=load_json(p)
            if d:write_doc(d,[c['slug']],allcats)
        for x in docs:write_doc(x['doc'],[c['slug'],x['slug']],allcats)
    (OUT/'404.html').write_text(shell('404','<main class="page"><h1>404</h1><p>문서를 찾을 수 없습니다.</p></main>','index.html',sidebar_html(allcats,[])),'utf-8')
    print(f'Built static wiki: {OUT}')

def write_doc(doc,parts,allcats):
    c=norm(doc.get('content'));dest=OUT.joinpath(*parts);dest.mkdir(parents=True,exist_ok=True)
    root='../'*(len(parts))+'index.html';self_href='index.html'
    intro=rewrite_html(c.get('introHtml',''),parts)
    body=f'<main class="page"><h1>{esc(doc.get("title"))}</h1><div class="intro body">{intro}</div>'
    if c.get('sections'):body+=f'<nav class="toc"><div class="toc-title">목차</div>{toc(c["sections"])}</nav>'
    body+=sections_html(c.get('sections',[]),parts,self_href)+footnotes_html(c.get('footnotes',[]),parts)+'</main>'
    (dest/'index.html').write_text(shell(doc.get('title','Duels Wiki'),body,root,sidebar_html(allcats,parts)),'utf-8')

if __name__=='__main__':build()
