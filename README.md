# OOO Interview Quiz

Railway에 올려서 집과 회사에서 같은 문제와 오답 기록을 쓰는 1인용 객관식 학습앱입니다.

## 로컬 실행

```bash
npm install
npm run prisma:generate
npm run dev
```

로컬/배포 환경에는 아래 환경변수가 필요합니다.

```bash
DATABASE_URL="postgresql://..."
```

## CSV 양식

앱의 `/upload` 화면에서 Excel 호환 CSV 양식을 다운로드할 수 있습니다.

필수 컬럼:

```text
question,choice_a,choice_b,choice_c,choice_d,correct,explanation
```

선택 컬럼:

```text
tag,category
```

`correct`는 `A`, `B`, `C`, `D` 중 하나여야 합니다.

## Railway 배포

1. Railway 프로젝트를 만들고 PostgreSQL 서비스를 추가합니다.
2. Next.js 서비스의 Variables에 Postgres의 `DATABASE_URL`을 reference variable로 연결합니다.
3. Deploy 설정의 Pre-deploy Command를 아래로 설정합니다.

```bash
npx prisma migrate deploy
```

4. 빌드 후 start command는 `package.json`의 `start` 스크립트가 사용됩니다.
