# Spurs Pulse Community DB

커뮤니티 게시글, 댓글, 추천, 방문 지표는 서버 API에서 처리합니다.

로컬 개발에서는 `data/community-store.json`, `data/analytics-store.json`을 사용합니다. Render 같은 배포 환경에서 글과 방문 지표를 안정적으로 남기려면 Supabase 프로젝트를 만들고 아래 환경변수를 Render 서비스에 추가하세요.

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
COMMUNITY_ADMIN_KEY=choose-a-private-moderation-key
```

Supabase SQL Editor에서 `data/community-schema.sql` 내용을 실행하면 필요한 테이블이 만들어집니다.

## API

- `GET /api/community-posts?team=tottenham&board=all`
- `POST /api/community-posts`
- `POST /api/community-comments`
- `POST /api/community-votes`
- `POST /api/community-reports`
- `POST /api/community-delete`
- `GET /api/analytics-summary`
- `POST /api/analytics-event`

서비스 롤 키와 `COMMUNITY_ADMIN_KEY`는 브라우저에 노출하지 말고 Render 환경변수에만 저장하세요.

일반 사용자는 자신이 작성한 브라우저에서만 글/댓글을 삭제할 수 있습니다. 운영자가 직접 삭제해야 할 때는 서버 API에 `adminKey`를 넣어 삭제할 수 있습니다.
