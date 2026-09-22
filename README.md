# Duels Wiki 3.2

3.0부터 편집기는 Next.js/Node.js를 사용하지 않습니다.

## 구조

- `DuelsWikiEditor.py` — **PC에 남겨둘 유일한 실행 파일**. Python 표준 라이브러리만 사용합니다.
- `repository/` — `godeungeojaban/duels_wiki` 저장소 루트에 업로드할 파일들입니다.
  - `editor/` — 런처가 실행할 때 GitHub에서 자동으로 내려받는 HTML/CSS/JS 편집기
  - `wiki/` — 문서 JSON
  - `media/` — PNG/JPG
  - `site/build.py` — 정적 열람 사이트 생성기
  - `.github/workflows/deploy-pages.yml` — GitHub Pages 자동 배포

표 기능은 3.0에서 완전히 제거했습니다.

## 최초 적용

1. GitHub의 `godeungeojaban/duels_wiki` 저장소에 `repository/` **안의 내용**을 저장소 루트로 업로드합니다.
   기존 `wiki/`, `media/` 데이터가 있다면 그 데이터는 유지하고 `editor/`, `site/`, `.github/`를 추가하면 됩니다.
2. GitHub 저장소 `Settings → Pages → Build and deployment → Source`를 **GitHub Actions**로 설정합니다.
3. PC에는 `DuelsWikiEditor.py`만 원하는 위치에 둡니다.
4. Python 3가 설치된 PC에서 `DuelsWikiEditor.py`를 실행합니다.
5. 브라우저가 자동으로 열립니다. 우측 상단 `GitHub 설정`에서 Fine-grained PAT를 입력합니다.
   - Repository access: `duels_wiki`
   - Contents: `Read and write`
   - Metadata: `Read-only`

토큰은 저장소에 들어가지 않습니다. Windows에서는 `%APPDATA%\DuelsWikiEditor\config.json`에만 저장됩니다.

## 이후 사용

`DuelsWikiEditor.py` 실행 → GitHub의 최신 `editor/` 다운로드 → 브라우저 편집기 자동 실행 → 저장하면 GitHub에 바로 commit됩니다.

`wiki/` 또는 `media/`가 바뀌면 GitHub Actions가 `site/build.py`를 실행하고 GitHub Pages를 자동 갱신합니다. 따라서 사용자가 `build.py`를 직접 실행할 필요가 없습니다.

편집기 HTML/CSS/JS를 수정해 GitHub `editor/`에 올리면, 런처를 다시 받을 필요 없이 다음 실행 시 새 UI가 자동으로 내려옵니다.

## URL 규칙

- `/` → Duels Wiki 전체
- `/카테고리/index.html` → 카테고리 정보
- `/카테고리/문서/index.html` → 일반 문서

정적 사이트의 내부 링크는 실제 `index.html` 파일을 직접 가리킵니다.

## 3.0 편집 기능

- 카테고리 생성/삭제
- `정보` 문서 자동 생성 및 카테고리 삭제 시 하위 문서 `미분류` 이동
- 일반 문서 생성/수정/삭제/카테고리 이동
- 문서 제목 블록(제목 + 소개 본문)
- 계층형 목차 블록 및 자동 번호
- 블록 내부 `＋ 하위`, `＋ 다음`, `삭제`
- 문서 제목 아래 자동 목차
- 굵게 / 기울임 / 취소선 / 글자색 / 글자 크기
- 좌/중앙/우 배치
- 위키 내부 링크 전용 선택 UI (`Duels Wiki` 전체 포함)
- PNG/JPG 외부 링크
- public GitHub `blob` 이미지 URL → `raw.githubusercontent.com` 자동 변환
- PNG/JPG 로컬 파일 → GitHub `media/images/` 업로드
- 이미지 가로/세로/회전/너비 자동 맞춤/정렬
- 이미지 선택 테두리와 8방향 크기 조절 핸들
- GitHub commit 기반 문서 역사 열람
- 모바일 기본 반응형 UI

## 이전 문서 호환

2.x의 `wiki-sections`/Tiptap JSON 문서는 읽을 때 3.0 HTML 블록 구조로 변환합니다. 3.0에서 저장한 문서는 `wiki-sections-v3` 형식으로 저장됩니다.


## 3.2 변경 사항

- `/`는 `wiki/_root.json`을 사용하는 실제 Duels Wiki 문서입니다.
- 카테고리와 문서 목록은 왼쪽 사이드바에서 탐색합니다.
- 편집 옵션 툴바를 실제 DOM에서 상단 헤더 바로 아래로 이동했습니다. 편집 중에는 `Duels Wiki / Editor 3.2 / GitHub 설정` 줄과 사이드바의 `카테고리 생성 / 문서 생성` 사이에 고정됩니다.
- `카테고리 생성`/`문서 생성` 버튼은 `white-space: nowrap`과 넓어진 사이드바 폭을 사용해 두 줄로 깨지지 않습니다.
- 3.1 배포본에 3.0 편집기 파일이 잘못 포함되었던 패키징 문제를 수정했습니다.
