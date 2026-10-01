# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## 급식 메뉴 DB 확장 (NEIS 연동)

관리자 > "급식 메뉴 가져오기" 화면은 교육부 NEIS 급식식단정보 Open API로 실제 학교 급식
데이터를 모아 메뉴 DB를 확장하는 기능이다. 이 기능을 쓰려면:

1. `.env.example`을 복사해 `.env`를 만들고, `VITE_NEIS_API_KEY`에 [open.neis.go.kr](https://open.neis.go.kr)에서
   발급받은 서비스키를 넣는다. 배포 환경(Netlify 등)에서는 해당 플랫폼의 환경변수 설정에
   같은 키를 등록한다.
2. `.env`는 커밋하지 않는다(`.gitignore`에 이미 제외되어 있음).

키를 설정하지 않아도 프로그램은 정상 동작한다 — 이 경우 "급식 메뉴 가져오기" 화면에
안내 메시지만 표시되고, 기존 메뉴 DB(초기 410개 + 관리자가 직접 추가/NEIS로 가져온 메뉴)만
그대로 사용된다. NEIS 호출은 이 화면에서 관리자가 명시적으로 "가져오기"를 눌렀을 때만
일어나며, 주간 식단 생성 버튼을 누를 때는 절대 호출되지 않는다 — 생성은 항상 LocalStorage에
저장된 메뉴 DB만 사용한다.
