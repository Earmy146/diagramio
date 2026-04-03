# DiagramIO

Web app cho phép người dùng:
- Viết SQL (MySQL, PostgreSQL, SQLite) → tự động sinh ERD diagram
- Kéo thả tạo bảng trực quan → tự động sinh SQL
- Lưu, chia sẻ, versioning các diagram
- Không cần đăng nhập vẫn dùng được (guest mode)

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Backend | Node.js, Express.js |
| ORM | Prisma |
| Database | MySQL 8+ |
| Frontend | React.js + Vite |
| Auth | JWT (access token + refresh token) |
| State | Zustand |
| Canvas | React Flow |
| SQL Editor | CodeMirror 6 |

## Cài đặt

### Prerequisites
- Node.js 18+
- MySQL 8+

### Backend

```bash
cd backend
cp .env.example .env
# Cập nhật DATABASE_URL và JWT secrets trong .env
npm install
npx prisma migrate dev --name init
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Cấu trúc dự án

```
diagramio/
├── backend/     # Express.js API server
└── frontend/    # React.js + Vite app
```
