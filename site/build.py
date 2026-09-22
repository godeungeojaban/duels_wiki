#!/usr/bin/env python3
from __future__ import annotations
import html, json, re, shutil
from pathlib import Path
from urllib.parse import quote, unquote

ROOT=Path(__file__).resolve().parents[1]
WIKI=ROOT/'wiki'; MEDIA=ROOT/'media'; OUT=ROOT/'site'/'dist'
UNCAT='미분류'

CSS='''
*{box-sizing:border-box}html,body{margin:0;font-family:Arial,"Noto Sans KR",sans-serif;color:#202124;background:#f6f7f8}body{line-height:1.5}.top{height:56px;background:#fff;border-bottom:1px solid #d9dde3;display:flex;align-items:center;padding:0 20px}.top a{color:#202124;text-decoration:none;font-weight:700;font-size:19px}.page{max-width:920px;margin:30px auto 80px;background:#fff;border:1px solid #d9dde3;border-radius:8px;padding:30px 38px;box-shadow:0 1px 3px rgba(0,0,0,.12)}h1{font-size:32px;margin:0 0 14px}.intro{margin-bottom:20px}.toc{border:1px solid #d9dde3;background:#fafbfc;border-radius:6px;padding:14px 18px;margin:22px 0}.toc-title{font-weight:700;margin-bottom:8px}.toc-line{margin:4px 0}.toc a,.body a,.section-title a,.index a{color:#1f8b4c;text-decoration:none}.toc a:hover,.body a:hover,.index a:hover{text-decoration:underline}.section{margin:25px 0}.section-title{border-bottom:1px solid #bfc5cc;padding-bottom:7px;margin:0 0 10px;line-height:1.35}.depth-1>.section-title{font-size:25px}.depth-2>.section-title{font-size:21px}.depth-3>.section-title{font-size:18px}.num{margin-right:6px}.body p{margin:.35em 0}.body img{max-width:100%;height:auto}.index h2{margin-top:26px}.muted{color:#69707a}@media(max-width:800px){.page{margin:12px 8px 50px;padding:20px 16px}h1{font-size:27px}}
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
def shell(title,body,root_href):return f'<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)} - Duels Wiki</title><style>{CSS}</style></head><body><header class="top"><a href="{root_href}">Duels Wiki</a></header>{body}</body></html>'

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
    write_doc(root_doc,[])
    for c,docs in allcats:
        if c.get('hasInfo'):
            p=WIKI/c['slug']/'_info.json';d=load_json(p)
            if d:write_doc(d,[c['slug']])
        for x in docs:write_doc(x['doc'],[c['slug'],x['slug']])
    (OUT/'404.html').write_text(shell('404','<main class="page"><h1>404</h1><p>문서를 찾을 수 없습니다.</p></main>','index.html'),'utf-8')
    print(f'Built static wiki: {OUT}')

def write_doc(doc,parts):
    c=norm(doc.get('content'));dest=OUT.joinpath(*parts);dest.mkdir(parents=True,exist_ok=True)
    root='../'*(len(parts))+'index.html';self_href='index.html'
    intro=rewrite_html(c.get('introHtml',''),parts)
    body=f'<main class="page"><h1>{esc(doc.get("title"))}</h1><div class="intro body">{intro}</div>'
    if c.get('sections'):body+=f'<nav class="toc"><div class="toc-title">목차</div>{toc(c["sections"])}</nav>'
    body+=sections_html(c.get('sections',[]),parts,self_href)+'</main>'
    (dest/'index.html').write_text(shell(doc.get('title','Duels Wiki'),body,root),'utf-8')

if __name__=='__main__':build()
