#!/usr/bin/env python3
# Duels Wiki Editor Launcher v3.77
# Standard library only. No npm / Node.js required.

from __future__ import annotations

import base64
import json
import mimetypes
import os
import re
import shutil
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

APP_VERSION = "4.0"
DEFAULT_OWNER = "godeungeojaban"
DEFAULT_REPO = "duels_wiki"
DEFAULT_BRANCH = "main"
DEFAULT_DATA_ROOT = "wiki"
DEFAULT_MEDIA_ROOT = "media"
EDITOR_FILES = ("index.html", "editor.css", "editor.js", "duels-reference.js", "version.json")
UNCAT_ID = "uncategorized"
UNCAT_SLUG = "미분류"


LAUNCHER_DIR = Path(__file__).resolve().parent
if os.name == "nt":
    APP_HOME = Path(os.environ.get("APPDATA", Path.home())) / "DuelsWikiEditor"
else:
    APP_HOME = Path.home() / ".duels-wiki-editor"
CACHE_DIR = APP_HOME / "editor-cache"
CONFIG_FILE = APP_HOME / "config.json"
# Local JSON documents are intentionally portable with the editor package.
# They live next to DuelsWikiEditor.py rather than in the per-user config/cache directory.
LOCAL_DOCUMENTS_DIR = LAUNCHER_DIR / "local-documents"
TOKEN_FILE = LAUNCHER_DIR / "token.txt"


def ensure_dirs() -> None:
    APP_HOME.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    LOCAL_DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)


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


def _local_filename(title: str) -> str:
    name = safe_slug(str(title or "").strip()) or "로컬 문서"
    return f"{name}.json"


def _find_local_document_file(local_id: str) -> tuple[Path | None, dict | None]:
    target_id = str(local_id or "").strip()
    if not target_id:
        return None, None
    for path in LOCAL_DOCUMENTS_DIR.glob("*.json"):
        try:
            data = json.loads(path.read_text("utf-8"))
            if not isinstance(data, dict):
                continue
            meta = data.get("_local") if isinstance(data.get("_local"), dict) else {}
            if str(meta.get("id") or "") == target_id:
                return path, data
        except Exception:
            continue
    return None, None


def _normalize_local_document_payload(document: dict, local_id: str | None = None, source: dict | None = None) -> dict:
    if not isinstance(document, dict):
        raise RuntimeError("로컬 문서 데이터가 올바르지 않습니다.")
    title = str(document.get("title") or "로컬 문서").strip() or "로컬 문서"
    content = document.get("content") if isinstance(document.get("content"), dict) else blank_content()
    now = now_iso()
    old_local = document.get("_local") if isinstance(document.get("_local"), dict) else {}
    lid = local_id or str(old_local.get("id") or "").strip() or uuid.uuid4().hex
    merged_source = source if isinstance(source, dict) else old_local.get("source") if isinstance(old_local.get("source"), dict) else {}
    return {
        "id": str(document.get("id") or f"local_{uuid.uuid4().hex}"),
        "kind": "local-document",
        "title": title,
        "slug": safe_slug(title) or "로컬 문서",
        "content": content,
        "createdAt": str(document.get("createdAt") or now),
        "updatedAt": now,
        "_local": {
            "version": 2,
            "id": lid,
            "source": merged_source,
        },
    }


def list_local_documents() -> list:
    ensure_dirs()
    rows = []
    for path in LOCAL_DOCUMENTS_DIR.glob("*.json"):
        try:
            data = json.loads(path.read_text("utf-8"))
            if not isinstance(data, dict):
                continue
            meta = data.get("_local") if isinstance(data.get("_local"), dict) else {}
            lid = str(meta.get("id") or path.stem)
            rows.append({
                "id": lid,
                "title": str(data.get("title") or path.stem),
                "updatedAt": str(data.get("updatedAt") or ""),
                "source": meta.get("source") if isinstance(meta.get("source"), dict) else {},
                "filename": path.name,
            })
        except Exception:
            continue
    rows.sort(key=lambda x: (x.get("updatedAt") or "", x.get("title") or ""), reverse=True)
    return rows


def load_local_document(local_id: str) -> dict:
    ensure_dirs()
    path, data = _find_local_document_file(local_id)
    if path is not None and isinstance(data, dict):
        return data
    # Hand-copied files without _local metadata remain openable by their filename stem.
    for path in LOCAL_DOCUMENTS_DIR.glob("*.json"):
        if path.stem != str(local_id):
            continue
        try:
            data = json.loads(path.read_text("utf-8"))
            if isinstance(data, dict):
                return data
        except Exception:
            break
    raise RuntimeError("로컬 문서를 찾을 수 없습니다.")


def save_local_document(document: dict, local_id: str | None = None, source: dict | None = None) -> dict:
    ensure_dirs()
    if not local_id and isinstance(source, dict) and source.get("path"):
        source_path = str(source.get("path"))
        for row in list_local_documents():
            row_source = row.get("source") if isinstance(row.get("source"), dict) else {}
            if str(row_source.get("path") or "") == source_path:
                local_id = str(row.get("id") or "") or None
                break

    old_path = None
    existing = None
    if local_id:
        old_path, existing = _find_local_document_file(local_id)
        if existing and isinstance(existing, dict):
            document = {**existing, **document, "content": document.get("content", existing.get("content"))}

    normalized = _normalize_local_document_payload(document, local_id=local_id, source=source)
    target = LOCAL_DOCUMENTS_DIR / _local_filename(normalized["title"])

    if target.exists() and (old_path is None or target.resolve() != old_path.resolve()):
        try:
            other = json.loads(target.read_text("utf-8"))
        except Exception:
            other = {}
        other_meta = other.get("_local") if isinstance(other, dict) and isinstance(other.get("_local"), dict) else {}
        if str(other_meta.get("id") or "") != str(normalized["_local"]["id"]):
            raise RuntimeError("같은 문서명의 로컬 JSON이 이미 존재합니다.")

    tmp = target.with_suffix(target.suffix + ".tmp")
    tmp.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), "utf-8")
    tmp.replace(target)
    if old_path is not None and old_path.exists() and old_path.resolve() != target.resolve():
        old_path.unlink(missing_ok=True)
    return normalized


def delete_local_document(local_id: str) -> None:
    ensure_dirs()
    path, _ = _find_local_document_file(local_id)
    if path is not None:
        path.unlink(missing_ok=True)
        return
    for path in LOCAL_DOCUMENTS_DIR.glob("*.json"):
        if path.stem == str(local_id):
            path.unlink(missing_ok=True)
            return
    raise RuntimeError("로컬 문서를 찾을 수 없습니다.")



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


def _assert_unique_document_slug(cfg: dict, slug: str, *, ignore_path: str | None = None) -> None:
    """Reject a document filename that already exists anywhere in the wiki tree."""
    if not slug:
        return
    wanted = f"{slug}.json"
    for cat in wiki_categories(cfg):
        cat_slug = str(cat.get("slug") or "").strip()
        if not cat_slug:
            continue
        try:
            entries = gh_list_dir(cfg, f"{cfg['data_root']}/{cat_slug}")
        except Exception:
            continue
        for ent in entries:
            if ent.get("type") != "file" or ent.get("name") != wanted:
                continue
            path = f"{cfg['data_root']}/{cat_slug}/{wanted}"
            if ignore_path and path == ignore_path:
                continue
            raise RuntimeError("같은 문서명이 이미 존재합니다. 문서 제목은 위키 전체에서 중복될 수 없습니다.")


def create_document(cfg: dict, category: str, title: str, content: dict):
    cats = wiki_categories(cfg)
    c = next((x for x in cats if x.get("slug") == category), None)
    if not c:
        raise RuntimeError("카테고리를 찾을 수 없습니다.")
    slug = safe_slug(title)
    if not slug or slug in {"정보", "_info"}:
        raise RuntimeError("사용할 수 없는 문서 제목입니다.")
    _assert_unique_document_slug(cfg, slug)
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
    _assert_unique_document_slug(cfg, next_slug, ignore_path=old_path)
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
        if all((CACHE_DIR / name).exists() for name in ("index.html", "editor.css", "editor.js", "duels-reference.js")):
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
            if u.path == "/api/local-documents":
                self.send_json({"documents": list_local_documents()}); return
            if u.path == "/api/local-document":
                local_id = q.get("id", [""])[0]
                self.send_json({"document": load_local_document(local_id)}); return
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
            if u.path == "/api/local-document":
                document = body.get("document") if isinstance(body.get("document"), dict) else {}
                local_id = str(body.get("id") or "").strip() or None
                source = body.get("source") if isinstance(body.get("source"), dict) else None
                self.send_json({"document": save_local_document(document, local_id=local_id, source=source)}); return
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
            u = urllib.parse.urlparse(self.path)
            q = urllib.parse.parse_qs(u.query)
            if u.path == "/api/local-document":
                delete_local_document(q.get("id", [""])[0])
                self.send_json({"ok": True}); return
            if not self.cfg.get("token"):
                self.send_json({"error": "GitHub Token을 먼저 설정해주세요."}, 401); return
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
        if name not in {"index.html", "editor.css", "editor.js", "duels-reference.js"}:
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
