# 개발 참고

플러그인 코드를 고치는 사람을 위한 문서입니다. 사용법은 [README](README.md)를 보세요.

## 버전

버전은 git 태그(`v1.0.0` …)로 관리합니다. Figma 개발용 플러그인에는 자체 버전 개념이 없고, 실행할 때마다 폴더의 파일을 새로 읽습니다.

```bash
git pull
git checkout <태그>
```

## 파일 구조 (Design System > Icons)

```
category (FRAME)
├─ menu labels (FRAME, 잠김)   아이콘 아래 이름. 세트 뒤에 깔려 있음
├─ menu (COMPONENT_SET)        카테고리 아이콘 원본. icon_menu_24pt=<이름>
├─ archive (FRAME)             보관한 아이콘의 mappin
└─ mappin (FRAME, 세로 오토레이아웃)
   ├─ boss_mappin_unfocused           행마다 프레임 1개
   ├─ boss_mappin_focused               핀 이름: <행>_<아이콘 이름>
   ├─ boss_mappin_fire_unfocused
   ├─ boss_mappin_fire_focused
   ├─ boss_mappin_coupon_unfocused
   ├─ boss_mappin_coupon_focused
   ├─ boss_mappin_verified_unfocused
   └─ boss_mappin_verified_focused
```

아이콘 그리드의 n번째와 mappin 각 행의 n번째 열은 같은 아이콘이다.

## 기능

**카테고리 아이콘 탭**
- 조회: 썸네일, 이름, mappin 개수(8/8, 없음, 일부)
- 추가: PNG + 이름 → 세트에 새 변형으로 등록, 그리드·레이블 자동 정렬
- 이미지 교체: 컴포넌트는 그대로 두고 그림만 바꿈 → 그 아이콘의 mappin도 자동으로 바뀜
- 이름 변경: 변형 값, mappin 핀 이름, 레이블을 같이 바꿈
- 보관: 세트에서 빼지 않고 설명에 `[보관]` 표시 → 다른 파일의 인스턴스는 깨지지 않음. mappin은 archive로 이동
- 복원: 보관의 반대. mappin을 원래 순서 자리로 되돌림

**mappin 생성 탭**
- mappin이 없거나 일부만 있는 아이콘만 목록에 뜬다. 고르면 빠진 행만 채운다
- 각 행의 기존 핀을 복제한 뒤 안의 아이콘만 교체하는 방식이라 장식은 원본과 동일

모든 작업은 Cmd+Z로 한 단계씩 되돌릴 수 있다.

## 입력 규칙

| 항목 | 규칙 |
|---|---|
| 형식 | PNG만 |
| 크기 | 정사각형, 72×72 이상 (24pt의 3배) |
| 배경 | 투명 (네 모서리 픽셀이 투명해야 통과) |
| 이름 | 영문 소문자·숫자·`_`, 기존 이름(보관 포함)과 중복 불가 |

여백은 PNG 안에 포함해서 넣는다. 플러그인은 이미지를 24×24에 맞춰(FIT) 넣기만 한다.

## 주의

- **게시(Publish)는 플러그인이 못 한다.** 변경 후 Design System 라이브러리를 게시해야 다른 파일에 반영된다.
- `menu labels` 프레임은 플러그인이 매번 다시 그린다. 손으로 고친 내용은 덮어써진다.
- 행 프레임 이름과 `category` 안의 프레임 이름을 바꾸면 플러그인이 구조를 못 찾는다.

## 남은 일 (2026-09-24 기준)

- `fruit_sando`, `wakppo_soguembbang`: 원본 PNG에 흰 배경이 있어 mappin을 지워둔 상태.
  투명 배경 PNG로 **이미지 교체** → **mappin 생성**으로 채우면 된다.
  (두 아이콘은 흰 배경 시트 한 장을 각자 잘라 쓰고 있었다. `wakppo_soguembbang`은 같은 이미지가 두 겹)
- 위 작업 후 Design System 라이브러리 게시.

## 검증 기록

플러그인 로직을 Figma에서 실제로 실행해 검사했다. 검사 스크립트는 마지막에 일부러 실패시켜
변경이 커밋되지 않게 했고, 실행 후 파일이 그대로인지 따로 확인했다.

- 72px 미만 거부, 이름 규칙·중복 거부
- 추가 → 35개 그리드·레이블 정렬, 변형 옵션 등록
- mappin 생성 → 8장 모두 행 안에 들어감, 아이콘 크기·위치가 템플릿과 동일, 페이지에 흩어진 핀 0
- 이미지 교체 후 핀 연결 유지, 이름 변경 시 핀·레이블 동기화
- 보관 → 복원, 추가 → 삭제 왕복 후 위치·레이어 순서까지 원래 상태와 동일

UI(파일 선택, 투명도 검사 등 iframe 쪽)는 Figma에서 직접 실행해 확인해야 한다.
