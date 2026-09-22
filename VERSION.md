# Duels Wiki 3.8

## 변경 사항

- 신규 Git 저장소의 첫 동기화 로직을 다시 작성했다.
- 첫 커밋이 없는 상태에서 `git stash`를 사용하지 않는다.
- PowerShell 백업/복원 단계와 잘못된 `^|` 파이프 이스케이프를 완전히 제거했다.
- `git fetch origin main` 후 `git reset origin/main`의 mixed reset을 사용해 원격 이력만 연결하고, 압축을 푼 현재 패키지 파일은 그대로 유지한다.
- 이후 `git add -A`가 원격의 오래된 파일 삭제와 3.8 파일 추가/수정을 한 번에 stage한다.
- `README.md`, `VERSION.md`가 저장소 루트에서 Git 추적 대상인지 push 전에 검증한다.
- Editor/launcher/version 표기를 3.8로 통일했다.
