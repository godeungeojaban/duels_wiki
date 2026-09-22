#!/usr/bin/env python3
from __future__ import annotations
import html, json, re, shutil
from pathlib import Path
from urllib.parse import quote, unquote

ROOT=Path(__file__).resolve().parents[1]
WIKI=ROOT/'wiki'; MEDIA=ROOT/'media'; OUT=ROOT/'site'/'dist'
UNCAT='미분류'

CSS='''
:root{--bg:#07090c;--panel:#0a1119;--line:#20394e;--line2:#29475f;--ink:#d9e8f3;--text:#aebdca;--muted:#607487;--accent:#44aaff;--top:62px;--font:"SUIT Variable","SUIT","Pretendard Variable","Pretendard","Wanted Sans","Noto Sans KR","Segoe UI",Arial,sans-serif;--mono:"Cascadia Code","SFMono-Regular",Consolas,monospace}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:var(--font);color:var(--ink);background:var(--bg);letter-spacing:-.018em}body{line-height:1.68;overflow-x:hidden;background-image:linear-gradient(#0d1a251f 1px,transparent 1px),linear-gradient(90deg,#0d1a2517 1px,transparent 1px);background-size:36px 36px}body:before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 72% 8%,#14335242,transparent 31%),linear-gradient(180deg,#05070a00,#03050788);z-index:-1}.top{height:var(--top);background:#070b10ee;border-bottom:1px solid #20394e;display:flex;align-items:center;padding:0 20px;position:sticky;top:0;z-index:60;box-shadow:0 10px 28px #0009;backdrop-filter:blur(10px)}.top:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:1px;background:linear-gradient(90deg,transparent,#44aaffaa 18%,#44aaff33 48%,transparent)}.brand-stack{display:flex;flex-direction:column}.top .brand{color:#44aaff;text-decoration:none;font-weight:700;font-size:20px;line-height:1;letter-spacing:.13em;text-transform:uppercase;text-shadow:0 0 14px #44aaff55}.brand-sub{margin-top:5px;color:#49647a;font:600 8px var(--mono);letter-spacing:.18em}.nav-toggle{display:none;margin-right:10px;border:1px solid #2a4a6a;background:#08111a;color:#adf;border-radius:2px;padding:6px 9px;font-size:18px;cursor:pointer}.layout{display:grid;grid-template-columns:278px minmax(0,1fr);min-height:calc(100vh - var(--top))}.sidebar{background:linear-gradient(180deg,#09111a,#060b11);border-right:1px solid #20394e;padding:0 12px 32px;position:sticky;top:var(--top);height:calc(100vh - var(--top));overflow:auto}.side-label{height:54px;margin:0 -12px 12px;padding:11px 14px;border-bottom:1px solid #1a3042;background:#08101a;display:flex;flex-direction:column;justify-content:center}.side-label span{font-size:12px;font-weight:700;letter-spacing:.2em;color:#70c6ff}.side-label small{margin-top:3px;font:600 8px var(--mono);letter-spacing:.16em;color:#425a6d}.side-root{display:flex;align-items:center;justify-content:space-between;padding:9px 10px;color:#a6c9df;text-decoration:none;font-weight:650;margin-bottom:9px;letter-spacing:.06em;border:1px solid #173148;border-left:2px solid #3a779e;background:#08131d}.side-root small{font:600 7px var(--mono);letter-spacing:.12em;color:#3e6078}.side-category{margin:2px 0 7px;border-bottom:1px solid #101e2a;padding-bottom:6px}.side-category>a,.side-category>span{display:flex;align-items:center;justify-content:space-between;padding:8px;color:#a9bed0;text-decoration:none;font-weight:650;border-left:2px solid transparent}.side-category small{font:600 7px var(--mono);letter-spacing:.12em;color:#344d61}.side-docs{margin:1px 0 3px}.side-link{display:block;position:relative;padding:7px 8px 7px 22px;color:#657b8e;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-left:2px solid transparent;font-size:12px}.side-link:before{content:"";position:absolute;left:9px;top:50%;width:5px;height:1px;background:#29475f}.side-root:hover,.side-link:hover,.side-category>a:hover{background:#0c1924;color:#dff;border-left-color:#315b7c}.side-link.active,.side-root.active,.side-category>a.active{background:linear-gradient(90deg,#102638,#09131c);color:#e5f6ff;border-left-color:#49b8ff;text-shadow:0 0 8px #4af5}.nav-scrim{display:none}.content{min-width:0;padding:28px 28px 80px}.content:before{content:"DUELS ARCHIVE // READ TERMINAL";display:block;max-width:1080px;margin:0 auto 8px;color:#344f65;font:600 9px var(--mono);letter-spacing:.18em}.page{position:relative;max-width:1080px;margin:0 auto;background:linear-gradient(180deg,#0b121aef,#080d13f4);border:1px solid #29475f;padding:30px 38px;box-shadow:0 0 0 1px #07101a,0 18px 50px #0008,0 0 28px #249cff10}.page:before{content:"";position:absolute;left:-1px;top:-1px;width:18px;height:18px;border-left:2px solid #4af;border-top:2px solid #4af}.page:after{content:"";position:absolute;right:-1px;bottom:-1px;width:18px;height:18px;border-right:2px solid #4af;border-bottom:2px solid #4af}h1{position:relative;font-size:32px;margin:0 0 18px;color:#dff4ff;letter-spacing:.045em;border-bottom:1px solid #1f3548;padding:6px 0 16px;text-shadow:0 0 15px #44aaff18}h1:before{content:"DOCUMENT";position:absolute;top:-8px;left:0;color:#3b607b;font:600 8px var(--mono);letter-spacing:.18em}.intro{margin-bottom:22px;color:#b5c3ce}.toc{border:1px solid #203b51;background:#08131d;padding:0;margin:24px 0}.toc-title{height:34px;display:flex;align-items:center;border-bottom:1px solid #1d3548;padding:0 13px;font-weight:700;color:#58bfff;font-size:9px;letter-spacing:.2em;text-transform:uppercase;background:#0a1721}.toc-line{margin:0;padding-top:5px;padding-bottom:5px;border-bottom:1px dashed #132738}.toc-line:last-child{border-bottom:0}.toc a,.body a,.section-title a{color:#65c6ff;text-decoration:none}.toc a:hover,.body a:hover{text-decoration:underline;text-shadow:0 0 8px #4af8}.section{margin:30px 0}.section-title{position:relative;border-bottom:1px solid #20394d;padding-bottom:8px;margin:0 0 13px;line-height:1.35;color:#d6e7f2}.section-title:after{content:"";position:absolute;left:0;bottom:-1px;width:74px;height:1px;background:#44aaff88}.depth-1>.section-title{font-size:24px}.depth-2>.section-title{font-size:20px;color:#bfd1de}.depth-3>.section-title{font-size:17px;color:#aebfcb}.num{margin-right:8px;color:#58bfff;font-family:var(--mono)}.body{color:#aebcc8;overflow-wrap:anywhere}.body p{margin:.48em 0}.body img{max-width:100%;height:auto}.body ul,.body ol{padding-left:1.7em}.body blockquote{border-left:2px solid #315b7c;margin:.8em 0;padding:.55em .9em;color:#91a1b2;background:#08131c}.muted{color:#607487}
@media(max-width:980px){.layout{grid-template-columns:236px minmax(0,1fr)}.content{padding:20px 14px 60px}.page{padding:25px 24px}}
@media(max-width:760px){:root{--top:54px}.nav-toggle{display:inline-block}.top{padding:0 9px}.top .brand{font-size:16px}.brand-sub{font-size:7px}.layout{display:block}.sidebar{position:fixed;left:0;top:var(--top);bottom:0;width:min(88vw,310px);height:auto;z-index:55;transform:translateX(-103%);transition:transform .18s ease;box-shadow:10px 0 30px #000d}.sidebar.open{transform:translateX(0)}.nav-scrim{display:block;position:fixed;inset:var(--top) 0 0;background:#0009;z-index:54;opacity:0;pointer-events:none;transition:opacity .18s}.nav-scrim.open{opacity:1;pointer-events:auto}.content{padding:12px 7px 48px}.content:before{margin:0 5px 7px;font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.page{padding:22px 14px}h1{font-size:26px;overflow-wrap:anywhere}.section{margin:24px 0}.depth-1>.section-title{font-size:21px}.depth-2>.section-title{font-size:18px}.depth-3>.section-title{font-size:16px}.body img{max-width:100%!important;height:auto!important}}
@media(max-width:420px){.brand-sub{display:none}.page{padding:19px 11px}.content{padding-left:4px;padding-right:4px}}
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
    if isinstance(c,dict) and c.get('type')=='wiki-sections-v3':return c
    if isinstance(c,dict) and c.get('type')=='wiki-sections':
        def cv(s):return {'id':s.get('id','sec'),'title':s.get('title','제목 없음'),'contentHtml':old_node(s.get('content') or {'type':'doc'}),'children':[cv(x) for x in s.get('children',[])]}
        return {'type':'wiki-sections-v3','introHtml':old_node(c.get('intro') or {'type':'doc'}),'sections':[cv(x) for x in c.get('sections',[])]}
    return {'type':'wiki-sections-v3','introHtml':old_node(c if isinstance(c,dict) else {'type':'doc'}),'sections':[]}

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

def rewrite_html(src,cur_parts):
    if not src:return''
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
        out.append(f'<div class="toc-line" style="padding-left:{depth*16}px"><a href="#{anchor(s.get("id"))}">{n}. {esc(s.get("title","제목 없음"))}</a></div>')
        out.append(toc(s.get('children',[]),n,depth+1))
    return ''.join(out)
def sections_html(sections,cur_parts,self_href,prefix='',depth=1):
    out=[]
    for i,s in enumerate(sections,1):
        n=f'{prefix}.{i}' if prefix else str(i); d=min(depth,3)
        body=rewrite_html(s.get('contentHtml',''),cur_parts)
        out.append(f'<section class="section depth-{d}"><h2 id="{anchor(s.get("id"))}" class="section-title"><a class="num" href="{self_href}">{n}.</a>{esc(s.get("title","제목 없음"))}</h2><div class="body">{body}</div>{sections_html(s.get("children",[]),cur_parts,self_href,n,depth+1)}</section>')
    return ''.join(out)
def sidebar_html(allcats,cur_parts):
    root_href=internal_href(cur_parts,'wiki:/')
    current='/'.join(cur_parts)
    out=[f'<a class="side-root {"active" if not cur_parts else ""}" href="{root_href}"><span>DUELS WIKI</span><small>ROOT</small></a>']
    for c,docs in allcats:
        slug=c.get('slug',''); name=c.get('name',slug)
        cat_parts=[slug]
        active_cat=(cur_parts==cat_parts)
        out.append('<div class="side-category">')
        if c.get('hasInfo'):
            href=internal_href(cur_parts,'wiki:/'+slug)
            out.append(f'<a class="{"active" if active_cat else ""}" href="{href}"><span>{esc(name)}</span><small>{"SYSTEM" if c.get("id")=="uncategorized" else "CATEGORY"}</small></a>')
        else:
            out.append(f'<span><b>{esc(name)}</b><small>{"SYSTEM" if c.get("id")=="uncategorized" else "CATEGORY"}</small></span>')
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

def shell(title,body,root_href,sidebar):
    return f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>{esc(title)} - Duels Wiki</title><style>{CSS}</style></head><body><header class="top"><button class="nav-toggle" id="navToggle" aria-label="문서 목록">☰</button><div class="brand-stack"><a class="brand" href="{root_href}">DUELS WIKI</a><span class="brand-sub">DATA ARCHIVE / READ ONLY</span></div></header><div class="layout"><aside class="sidebar" id="wikiSidebar"><div class="side-label"><span>ARCHIVE</span><small>DOCUMENT INDEX</small></div>{sidebar}</aside><div class="nav-scrim" id="navScrim"></div><div class="content">{body}</div></div><script>(function(){{var b=document.getElementById('navToggle'),s=document.getElementById('wikiSidebar'),m=document.getElementById('navScrim');function set(open){{s.classList.toggle('open',open);m.classList.toggle('open',open)}}if(b&&s)b.addEventListener('click',function(){{set(!s.classList.contains('open'))}});if(m)m.addEventListener('click',function(){{set(false)}});s&&s.addEventListener('click',function(e){{if(e.target.closest('a')&&innerWidth<=760)set(false)}});addEventListener('resize',function(){{if(innerWidth>760)set(false)}})}})();</script></body></html>'''


def build():
    if OUT.exists():shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    if MEDIA.exists():shutil.copytree(MEDIA,OUT/'media',dirs_exist_ok=True)
    cats=load_json(WIKI/'categories.json',[]) or []
    if isinstance(cats,dict):cats=cats.get('categories',[])
    if not any(c.get('id')=='uncategorized' for c in cats):cats.append({'id':'uncategorized','name':'미분류','slug':'미분류','hasInfo':False,'system':True})
    cats.sort(key=lambda c:(1 if c.get('id')=='uncategorized' or c.get('slug')==UNCAT else 0,c.get('name','')))
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
    body+=sections_html(c.get('sections',[]),parts,self_href)+'</main>'
    (dest/'index.html').write_text(shell(doc.get('title','Duels Wiki'),body,root,sidebar_html(allcats,parts)),'utf-8')

if __name__=='__main__':build()
