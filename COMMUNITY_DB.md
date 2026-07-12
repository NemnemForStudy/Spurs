# Spurs Pulse Community DB

커뮤니티 게시글, 댓글, 추천은 서버 API에서 처리합니다.

로컬 개발에서는 `data/community-store.json`을 사용합니다. Render 같은 배포 환경에서 글을 안정적으로 남기려면 Supabase 프로젝트를 만들고 아래 환경변수를 Render 서비스에 추가하세요.

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Supabase SQL Editor에서 `data/community-schema.sql` 내용을 실행하면 필요한 테이블이 만들어집니다.

## API

- `GET /api/teams`
- `GET /api/teams/tottenham`
- `GET /api/community-posts?team=tottenham&board=all`
- `POST /api/community-posts`
- `POST /api/community-comments`
- `POST /api/community-votes`

서비스 롤 키는 브라우저에 노출하지 말고 Render 환경변수에만 저장하세요.
