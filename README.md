# VFilemanage 다운로드 페이지 (`prelaps.com/vfile/`)

이 브랜치는 **`main` 과 아무 관련이 없다.** `main` 은 Electron 앱 소스이고,
여기는 그 앱을 받게 하는 웹 페이지다. 커밋 이력이 아예 갈라져 있으니
둘을 머지하려 들지 말 것.

```
site/        3개 언어 정적 페이지 (ko·en·ja)
worker/      /vfile 접두사를 떼고 GA·애드센스를 주입하는 얇은 층
docs/        기획서
test/        링크 전수 검사
```

## 배포

**GitHub 에 push 하는 것은 배포가 아니다.** 여기는 백업일 뿐이고,
라이브는 디스크에서 직접 올라간다.

```
npm run deploy      # = npm run check:links && npx wrangler deploy
```

무엇이 올라가 있는지는 status code 가 아니라 `npx wrangler deployments list`
로 확인한다.

## 주의

- **GitHub Pages 를 켜지 말 것.** 예전에 `main` 의 `docs/` 로 같은 다운로드
  페이지가 한 번 더 열려 있었다. 같은 내용이 두 주소에 있으면 중복 콘텐츠가
  되고, 검색 신호가 `prelaps.com` 에 쌓이지 않는다. 정식 주소는
  `https://prelaps.com/vfile/<언어>/` 하나뿐이다.
- 내부 링크는 전부 상대 경로다. 이 도구는 도메인 루트에 있지 않아서
  `/styles.css` 같은 절대 경로는 전부 깨진다.
- 정책 페이지(개인정보·약관·문의)는 허브에 하나씩 있다. 여기 만들지 않는다.

도메인 전체 규칙은 `prelaps-home/docs/prelaps-architecture.md` 다.
