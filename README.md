# Duels Wiki 3.8

Duels Wiki 3.8는 Python 표준 라이브러리 기반 로컬 편집기 + GitHub 저장소 + GitHub Pages 정적 열람 사이트 구조다. Node.js/Next.js/npm은 사용하지 않는다.

## 실행

1. `DuelsWikiEditor.py`를 PC에 둔다.
2. `python DuelsWikiEditor.py`로 실행한다.
3. 첫 실행 시 우측 상단 `GitHub 설정`에서 Fine-grained PAT를 입력한다.
   - Repository access: `godeungeojaban/duels_wiki`
   - Contents: Read and write
4. 편집기는 GitHub 저장소의 `editor/` 최신 파일을 내려받아 브라우저에서 연다.

토큰은 저장소에 올라가지 않고 로컬 설정에만 저장된다.

## 3.8 편집기

기존 옵션 바를 제거하고 Microsoft Word 방식에 가깝게 리본 UI로 재구성했다.

- 홈
  - 실행 취소/다시 실행
  - 굵게, 기울임, 밑줄, 취소선
  - 위첨자/아래첨자
  - 글자 크기
  - 글자색 / 강조색
  - 서식 지우기
  - 글머리 기호 / 번호 매기기
  - 들여쓰기 / 내어쓰기
  - 좌/중앙/우/양쪽 정렬
  - 줄 간격 / 문단 뒤 간격
  - 내부 링크 / 링크 해제
- 삽입
  - 내부 링크
  - PNG/JPG 그림 링크
  - PNG/JPG 저장소 업로드
  - 행/열 개수를 지정하는 표 삽입
- 그림 컨텍스트 탭
  - 그림을 선택한 경우에만 표시
  - 너비/높이/회전
  - 90도 회전
  - 문서 너비 맞춤
  - 좌/중앙/우 배치
  - 텍스트 줄 안 / 위아래 / 좌우 감싸기
  - 그림 테두리와 대체 텍스트
  - 8방향 드래그 크기 조절
- 표 컨텍스트 탭
  - 표 셀을 선택한 경우에만 표시
  - 행/열 추가 및 삭제
  - 표 삭제/전체 선택
  - 셀 드래그 다중 선택
  - 셀 병합/분할
  - 행/열 균등 분배
  - 열 너비/행 높이
  - 표 좌/중앙/우 배치와 창 너비 맞춤
  - 셀 가로/세로 정렬
  - 셀 배경색 제거/지정
  - 테두리 색/두께/스타일

글꼴 종류 선택은 의도적으로 넣지 않았다.

## 저장소 구조

`repository/` 내부가 그대로 GitHub 저장소 루트가 된다. `README.md`와 `VERSION.md`도 이 안에 있으므로 함께 commit된다.

```text
repository/
├─ README.md              저장소 설명
├─ VERSION.md             버전 변경 내역
├─ editor/                 GitHub에서 내려받는 편집기 UI
├─ wiki/                   문서 JSON
├─ media/images/           PNG/JPG
├─ site/build.py           정적 위키 생성기
├─ .github/workflows/      GitHub Pages 자동 배포
└─ git_sync.bat            Git add/commit/pull --rebase/push 자동화
```

GitHub에 올릴 때는 `repository/` 폴더 자체가 아니라 **그 안의 내용**을 저장소 루트에 둔다.

## Git 자동화

저장소 루트의 `git_sync.bat`을 실행하면 다음 순서로 동작한다.

1. Git 초기화 여부 확인
2. `origin`이 없으면 `godeungeojaban/duels_wiki` 연결
3. `git add -A`
4. 변경사항이 있으면 커밋 메시지를 입력받아 commit
5. `git pull --rebase origin main`
6. `git push -u origin main`

충돌이 발생하면 자동으로 강제 push하지 않고 중단한다.

## 정적 열람

`wiki/`, `media/`, `site/` 변경이 main에 push되면 GitHub Actions가 `site/build.py`를 실행하고 GitHub Pages용 정적 HTML을 배포한다.


## 3.8 Git 동기화 변경

- 처음 압축을 푼 폴더처럼 local commit이 하나도 없는 저장소를 자동 감지한다.
- 원격 `main`이 이미 있으면 로컬 패키지 파일을 임시 백업하고 원격 이력을 연결한 뒤 패키지 파일을 다시 덮어쓴다.
- 첫 commit이 없어 `git stash`가 실패하던 문제를 제거했다.
- `README.md`, `VERSION.md`가 Git 추적 대상인지 동기화 도중 직접 검사한다.
- 두 문서는 `repository/` 내부에만 존재하며 바깥 중복본은 제거했다.

## 3.11 table resizing
표 편집 중 셀을 선택하면 선택 열의 오른쪽 경계, 선택 행의 아래 경계, 표 우하단에 크기 조절 핸들이 표시됩니다. 드래그로 열 너비, 행 높이, 표 전체 크기를 조절할 수 있습니다.
