#!/usr/bin/env python3
from __future__ import annotations
import html, json, re, shutil
from pathlib import Path
from urllib.parse import quote, unquote

ROOT=Path(__file__).resolve().parents[1]
WIKI=ROOT/'wiki'; MEDIA=ROOT/'media'; OUT=ROOT/'site'/'dist'
UNCAT='미분류'

CSS='''
*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:"SUIT Variable","SUIT","Pretendard Variable","Pretendard","Wanted Sans","Noto Sans KR","Segoe UI",Arial,sans-serif;color:#e0e0e0;background:#0a0a0c;letter-spacing:-.018em}body{line-height:1.6}.top{height:58px;background:#090b0f;border-bottom:1px solid #1f3345;display:flex;align-items:center;padding:0 20px;position:sticky;top:0;z-index:50;box-shadow:0 6px 22px #0008}.top a{color:#44aaff;text-decoration:none;font-weight:650;font-size:20px;letter-spacing:.12em;text-transform:uppercase;text-shadow:0 0 12px #4af5}.nav-toggle{display:none;margin-right:10px;border:1px solid #2a4a6a;background:transparent;color:#adf;border-radius:2px;padding:6px 9px;font-size:18px;cursor:pointer}.layout{display:grid;grid-template-columns:292px minmax(0,1fr);min-height:calc(100vh - 58px)}.sidebar{background:linear-gradient(180deg,#0c1118,#080c11);border-right:1px solid #203548;padding:18px 14px 40px;position:sticky;top:58px;height:calc(100vh - 58px);overflow:auto}.side-root{display:block;padding:9px 10px;color:#9fc8e6;text-decoration:none;font-weight:650;margin-bottom:9px;letter-spacing:.08em;border-left:2px solid transparent}.side-root:hover,.side-link:hover{background:#0f1b27;color:#dff;border-left-color:#315b7c}.side-category{margin:9px 0 3px}.side-category>a,.side-category>span{display:block;padding:7px 10px;color:#a9bed0;text-decoration:none;font-weight:650;border-left:2px solid transparent}.side-category>a:hover{background:#0f1b27;color:#dff;border-left-color:#315b7c}.side-docs{margin:1px 0 8px;padding-left:10px;border-left:1px solid #1d3042}.side-link{display:block;padding:6px 10px;color:#718395;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-left:2px solid transparent;font-size:13px}.side-link.active,.side-root.active,.side-category>a.active{background:#102130;color:#dff;border-left-color:#49b8ff;text-shadow:0 0 8px #4af4}.content{min-width:0;background:radial-gradient(circle at 72% 0,#10223755,transparent 33%),#0a0a0c}.page{max-width:980px;margin:30px auto 80px;background:linear-gradient(180deg,#0d1219,#0a0f15);border:1px solid #29435c;padding:30px 38px;box-shadow:0 0 0 1px #09111b,0 0 24px #249cff14}h1{font-size:33px;margin:0 0 16px;color:#dceeff;letter-spacing:.035em;border-bottom:1px solid #1e3447;padding-bottom:14px}.intro{margin-bottom:20px;color:#b9c5d0}.toc{border:1px solid #223b51;background:linear-gradient(180deg,#0b141d,#09111a);padding:14px 18px;margin:22px 0}.toc-title{font-weight:650;margin-bottom:8px;color:#58bfff;font-size:11px;letter-spacing:.18em;text-transform:uppercase}.toc-line{margin:5px 0}.toc a,.body a,.section-title a{color:#65c6ff;text-decoration:none}.toc a:hover,.body a:hover{text-decoration:underline;text-shadow:0 0 8px #4af8}.section{margin:28px 0}.section-title{border-bottom:1px solid #1e3447;padding-bottom:8px;margin:0 0 12px;line-height:1.35;color:#d9e7f3}.depth-1>.section-title{font-size:25px}.depth-2>.section-title{font-size:21px}.depth-3>.section-title{font-size:18px}.num{margin-right:7px;color:#58bfff}.body{color:#b7c2cc}.body p{margin:.42em 0}.body img{max-width:100%;height:auto}.body ul,.body ol{padding-left:2em}.body blockquote{border-left:2px solid #315b7c;margin:.7em 0;padding:.35em .9em;color:#91a1b2;background:#09131d}.muted{color:#667788}
@media(max-width:900px){.layout{grid-template-columns:240px minmax(0,1fr)}.page{margin:18px 14px 60px}}
@media(max-width:720px){.nav-toggle{display:inline-block;color:#adf}.layout{display:block}.sidebar{position:fixed;left:0;top:58px;bottom:0;width:min(86vw,300px);height:auto;z-index:45;transform:translateX(-102%);transition:transform .18s ease;box-shadow:8px 0 24px #000b}.sidebar.open{transform:translateX(0)}.page{margin:12px 8px 50px;padding:20px 16px}h1{font-size:27px}.top{padding:0 10px}.top a{font-size:17px}}
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

def shell(title,body,root_href,sidebar):
    return f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)} - Duels Wiki</title><style>{CSS}</style></head><body><header class="top"><button class="nav-toggle" id="navToggle" aria-label="문서 목록">☰</button><a href="{root_href}">Duels Wiki</a></header><div class="layout"><aside class="sidebar" id="wikiSidebar">{sidebar}</aside><div class="content">{body}</div></div><script>(function(){{var b=document.getElementById('navToggle'),s=document.getElementById('wikiSidebar');if(b&&s)b.addEventListener('click',function(){{s.classList.toggle('open')}});document.addEventListener('click',function(e){{if(window.innerWidth>720||!s.classList.contains('open'))return;if(e.target.closest('#wikiSidebar')||e.target.closest('#navToggle'))return;s.classList.remove('open')}})}})();</script></body></html>'''

def build():
    if OUT.exists():shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    if MEDIA.exists():shutil.copytree(MEDIA,OUT/'media',dirs_exist_ok=True)
    cats=load_json(WIKI/'categories.json',[]) or []
    if isinstance(cats,dict):cats=cats.get('categories',[])
    if not any(c.get('id')=='uncategorized' for c in cats):cats.append({'id':'uncategorized','name':'미분류','slug':'미분류','hasInfo':False,'system':True})
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
