# AGENT_SETUP.md — DiagramIO Project

> **Dành cho AI Agent:** Đọc toàn bộ file này trước khi làm bất cứ điều gì.
> File này mô tả đầy đủ dự án, cấu trúc thư mục, schema database, và thứ tự các task cần thực hiện.
> Làm tuần tự từng Phase, không skip bước nào.

---

## 1. Tổng quan dự án

**DiagramIO** là web app cho phép người dùng:
- Viết SQL (MySQL, PostgreSQL, SQLite) → tự động sinh ERD diagram
- Kéo thả tạo bảng trực quan → tự động sinh SQL
- Lưu, chia sẻ, versioning các diagram
- Không cần đăng nhập vẫn dùng được (guest mode)

**Tech Stack:**
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
| Realtime (phase 3) | Socket.io |

---

## 2. Cấu trúc thư mục cần tạo

> **Tạo đúng cấu trúc này trong thư mục `diagramio/`**

```
diagramio/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          ← Tạo theo Section 3
│   │   └── migrations/            ← Tự sinh khi chạy migrate
│   ├── src/
│   │   ├── app.js                 ← Express app entry
│   │   ├── server.js              ← HTTP server start
│   │   ├── config/
│   │   │   ├── env.js             ← Load & validate env vars
│   │   │   └── prisma.js          ← Prisma client singleton
│   │   ├── routes/
│   │   │   ├── index.js           ← Mount tất cả routes
│   │   │   ├── auth.routes.js
│   │   │   ├── project.routes.js
│   │   │   ├── diagram.routes.js
│   │   │   ├── parser.routes.js
│   │   │   └── export.routes.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── project.controller.js
│   │   │   ├── diagram.controller.js
│   │   │   ├── parser.controller.js
│   │   │   └── export.controller.js
│   │   ├── services/
│   │   │   ├── auth.service.js
│   │   │   ├── project.service.js
│   │   │   ├── diagram.service.js
│   │   │   ├── sqlParser.service.js   ← Parse SQL → ERD JSON
│   │   │   ├── sqlGenerator.service.js ← ERD JSON → SQL
│   │   │   └── export.service.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js      ← Verify JWT
│   │   │   ├── guest.middleware.js     ← Guest session via cookie UUID
│   │   │   ├── validate.middleware.js  ← Zod request validation
│   │   │   └── error.middleware.js     ← Global error handler
│   │   └── utils/
│   │       ├── response.js            ← Chuẩn hóa API response
│   │       ├── token.js               ← JWT sign/verify helpers
│   │       └── slug.js                ← Tạo unique slug
│   ├── .env                           ← Tạo theo Section 4
│   ├── .env.example
│   └── package.json                   ← Tạo theo Section 5
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Canvas/
│   │   │   │   ├── ERDCanvas.jsx      ← React Flow canvas chính
│   │   │   │   ├── TableNode.jsx      ← Custom node hiển thị bảng
│   │   │   │   └── RelationshipEdge.jsx ← Custom edge crow's foot
│   │   │   ├── SqlEditor/
│   │   │   │   └── SqlEditor.jsx      ← CodeMirror 6 editor
│   │   │   ├── TableBuilder/
│   │   │   │   ├── TableForm.jsx      ← Form tạo/sửa bảng
│   │   │   │   └── ColumnRow.jsx      ← Một dòng column
│   │   │   ├── Toolbar/
│   │   │   │   └── Toolbar.jsx
│   │   │   └── shared/
│   │   │       ├── Button.jsx
│   │   │       └── Modal.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Editor.jsx             ← Màn hình chính
│   │   │   ├── Dashboard.jsx
│   │   │   └── Share.jsx              ← View-only shared diagram
│   │   ├── store/
│   │   │   ├── diagramStore.js        ← Zustand: nodes, edges, sql
│   │   │   └── authStore.js           ← Zustand: user, token
│   │   ├── hooks/
│   │   │   ├── useAutoSave.js
│   │   │   └── useSqlSync.js
│   │   ├── services/
│   │   │   └── api.js                 ← Axios instance + interceptors
│   │   └── utils/
│   │       └── erdHelpers.js
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 3. Prisma Schema — Tạo file `backend/prisma/schema.prisma`

```prisma
// backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────
model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique @db.VarChar(255)
  username     String   @unique @db.VarChar(100)
  passwordHash String   @map("password_hash") @db.VarChar(255)
  avatarUrl    String?  @map("avatar_url") @db.VarChar(500)
  plan         Plan     @default(FREE)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relations
  projects             Project[]
  projectVersions      ProjectVersion[]
  projectCollaborators ProjectCollaborator[]
  comments             Comment[]
  refreshTokens        RefreshToken[]

  @@map("users")
}

enum Plan {
  FREE
  PRO
  TEAM
}

// ─────────────────────────────────────────────
// REFRESH TOKENS
// ─────────────────────────────────────────────
model RefreshToken {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  token     String   @unique @db.VarChar(512)
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}

// ─────────────────────────────────────────────
// PROJECTS
// Nullable userId = guest project (lưu theo guestToken cookie)
// ─────────────────────────────────────────────
model Project {
  id             Int      @id @default(autoincrement())
  userId         Int?     @map("user_id")
  guestToken     String?  @map("guest_token") @db.VarChar(255)
  name           String   @db.VarChar(255)
  description    String?  @db.Text
  slug           String   @unique @db.VarChar(300)
  isPublic       Boolean  @default(false) @map("is_public")
  thumbnailUrl   String?  @map("thumbnail_url") @db.VarChar(500)
  defaultDialect Dialect  @default(MYSQL) @map("default_dialect")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  // Relations
  user                 User?                 @relation(fields: [userId], references: [id], onDelete: SetNull)
  diagrams             Diagram[]
  projectVersions      ProjectVersion[]
  sqlFiles             SqlFile[]
  sharedLinks          SharedLink[]
  projectCollaborators ProjectCollaborator[]

  @@index([userId])
  @@index([guestToken])
  @@map("projects")
}

enum Dialect {
  MYSQL
  POSTGRESQL
  SQLITE
  NOSQL
}

// ─────────────────────────────────────────────
// DIAGRAMS
// Một project có thể có nhiều diagram (nhiều phiên bản schema)
// canvasState: JSON lưu zoom, pan, layout tùy chỉnh
// ─────────────────────────────────────────────
model Diagram {
  id           Int      @id @default(autoincrement())
  projectId    Int      @map("project_id")
  name         String   @default("Main Diagram") @db.VarChar(255)
  canvasState  Json?    @map("canvas_state")
  zoomLevel    Float    @default(1.0) @map("zoom_level")
  panX         Int      @default(0) @map("pan_x")
  panY         Int      @default(0) @map("pan_y")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relations
  project       Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  erdTables     ErdTable[]
  relationships Relationship[]
  comments      Comment[]

  @@index([projectId])
  @@map("diagrams")
}

// ─────────────────────────────────────────────
// ERD TABLES
// Mỗi bảng trong diagram ERD
// posX, posY: vị trí trên canvas
// color: màu header của bảng (hex string)
// ─────────────────────────────────────────────
model ErdTable {
  id          Int      @id @default(autoincrement())
  diagramId   Int      @map("diagram_id")
  name        String   @db.VarChar(255)
  displayName String?  @map("display_name") @db.VarChar(255)
  posX        Int      @default(0) @map("pos_x")
  posY        Int      @default(0) @map("pos_y")
  color       String   @default("#6366f1") @db.VarChar(20)
  comment     String?  @db.Text
  createdAt   DateTime @default(now()) @map("created_at")

  // Relations
  diagram           Diagram        @relation(fields: [diagramId], references: [id], onDelete: Cascade)
  columns           ErdColumn[]
  fromRelationships Relationship[] @relation("FromTable")
  toRelationships   Relationship[] @relation("ToTable")

  @@index([diagramId])
  @@map("erd_tables")
}

// ─────────────────────────────────────────────
// ERD COLUMNS
// Mỗi cột trong một bảng ERD
// ─────────────────────────────────────────────
model ErdColumn {
  id              Int      @id @default(autoincrement())
  tableId         Int      @map("table_id")
  name            String   @db.VarChar(255)
  dataType        String   @map("data_type") @db.VarChar(100)
  isPrimary       Boolean  @default(false) @map("is_primary")
  isUnique        Boolean  @default(false) @map("is_unique")
  isNullable      Boolean  @default(true) @map("is_nullable")
  isAutoIncrement Boolean  @default(false) @map("is_auto_increment")
  isForeign       Boolean  @default(false) @map("is_foreign")
  defaultValue    String?  @map("default_value") @db.VarChar(255)
  comment         String?  @db.VarChar(500)
  sortOrder       Int      @default(0) @map("sort_order")

  // Relations
  table              ErdTable       @relation(fields: [tableId], references: [id], onDelete: Cascade)
  fromRelationships  Relationship[] @relation("FromColumn")
  toRelationships    Relationship[] @relation("ToColumn")

  @@index([tableId])
  @@map("erd_columns")
}

// ─────────────────────────────────────────────
// RELATIONSHIPS
// FK relationships giữa các bảng
// relType: ONE_TO_ONE | ONE_TO_MANY | MANY_TO_MANY
// ─────────────────────────────────────────────
model Relationship {
  id             Int          @id @default(autoincrement())
  diagramId      Int          @map("diagram_id")
  fromTableId    Int          @map("from_table_id")
  fromColumnId   Int          @map("from_column_id")
  toTableId      Int          @map("to_table_id")
  toColumnId     Int          @map("to_column_id")
  relType        RelationType @default(ONE_TO_MANY) @map("rel_type")
  label         String?      @db.VarChar(255)
  onDelete       FKAction     @default(RESTRICT) @map("on_delete")
  onUpdate       FKAction     @default(CASCADE) @map("on_update")

  // Relations
  diagram    Diagram   @relation(fields: [diagramId], references: [id], onDelete: Cascade)
  fromTable  ErdTable  @relation("FromTable", fields: [fromTableId], references: [id], onDelete: Cascade)
  fromColumn ErdColumn @relation("FromColumn", fields: [fromColumnId], references: [id], onDelete: Cascade)
  toTable    ErdTable  @relation("ToTable", fields: [toTableId], references: [id], onDelete: Cascade)
  toColumn   ErdColumn @relation("ToColumn", fields: [toColumnId], references: [id], onDelete: Cascade)

  @@index([diagramId])
  @@map("relationships")
}

enum RelationType {
  ONE_TO_ONE
  ONE_TO_MANY
  MANY_TO_MANY
}

enum FKAction {
  CASCADE
  RESTRICT
  SET_NULL
  NO_ACTION
}

// ─────────────────────────────────────────────
// PROJECT VERSIONS
// Snapshot toàn bộ diagram state để rollback
// snapshot: JSON đầy đủ tables + columns + relationships + positions
// ─────────────────────────────────────────────
model ProjectVersion {
  id            Int      @id @default(autoincrement())
  projectId     Int      @map("project_id")
  userId        Int?     @map("user_id")
  snapshot      Json
  message       String?  @db.VarChar(500)
  versionNumber Int      @map("version_number")
  createdAt     DateTime @default(now()) @map("created_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User?   @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([projectId])
  @@map("project_versions")
}

// ─────────────────────────────────────────────
// SQL FILES
// Lưu raw SQL text theo dialect
// Mỗi lần export/save SQL tạo một record mới
// ─────────────────────────────────────────────
model SqlFile {
  id        Int      @id @default(autoincrement())
  projectId Int      @map("project_id")
  content   String   @db.LongText
  dialect   Dialect
  filename  String   @db.VarChar(255)
  createdAt DateTime @default(now()) @map("created_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@map("sql_files")
}

// ─────────────────────────────────────────────
// SHARED LINKS
// Token-based sharing, có thể set expiry và permission
// ─────────────────────────────────────────────
model SharedLink {
  id         Int        @id @default(autoincrement())
  projectId  Int        @map("project_id")
  token      String     @unique @db.VarChar(64)
  permission SharePerm  @default(VIEW)
  expiresAt  DateTime?  @map("expires_at")
  viewCount  Int        @default(0) @map("view_count")
  createdAt  DateTime   @default(now()) @map("created_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([token])
  @@map("shared_links")
}

enum SharePerm {
  VIEW
  EDIT
}

// ─────────────────────────────────────────────
// PROJECT COLLABORATORS
// Nhiều user cùng làm việc trên một project
// ─────────────────────────────────────────────
model ProjectCollaborator {
  id        Int            @id @default(autoincrement())
  projectId Int            @map("project_id")
  userId    Int            @map("user_id")
  role      CollabRole     @default(VIEWER)
  joinedAt  DateTime       @default(now()) @map("joined_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@map("project_collaborators")
}

enum CollabRole {
  VIEWER
  EDITOR
  ADMIN
}

// ─────────────────────────────────────────────
// TEMPLATES
// Các diagram mẫu được cung cấp sẵn hoặc do user tạo
// isOfficial: true = built-in template của app
// ─────────────────────────────────────────────
model Template {
  id          Int      @id @default(autoincrement())
  name        String   @db.VarChar(255)
  description String?  @db.Text
  category    String   @db.VarChar(100)
  canvasData  Json     @map("canvas_data")
  sqlContent  String   @map("sql_content") @db.LongText
  dialect     Dialect  @default(MYSQL)
  isOfficial  Boolean  @default(false) @map("is_official")
  useCount    Int      @default(0) @map("use_count")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("templates")
}

// ─────────────────────────────────────────────
// COMMENTS
// Annotation ghim trên diagram, có tọa độ x/y
// tableId nullable: comment gắn vào bảng cụ thể hoặc free-floating
// ─────────────────────────────────────────────
model Comment {
  id         Int      @id @default(autoincrement())
  diagramId  Int      @map("diagram_id")
  userId     Int?     @map("user_id")
  tableId    Int?     @map("table_id")
  content    String   @db.Text
  posX       Int      @default(0) @map("pos_x")
  posY       Int      @default(0) @map("pos_y")
  isResolved Boolean  @default(false) @map("is_resolved")
  createdAt  DateTime @default(now()) @map("created_at")

  diagram Diagram @relation(fields: [diagramId], references: [id], onDelete: Cascade)
  user    User?   @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([diagramId])
  @@map("comments")
}
```

---

## 4. Environment Variables — Tạo `backend/.env`

```env
# Database
DATABASE_URL="mysql://root:yourpassword@localhost:3306/diagramio"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-refresh-secret-key-change-this-too"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Guest session
GUEST_COOKIE_NAME="diagramio_guest"
GUEST_COOKIE_MAX_AGE=2592000000
```

Tạo thêm `backend/.env.example` với cùng keys nhưng values để trống.

---

## 5. Backend `package.json` — Tạo `backend/package.json`

```json
{
  "name": "diagramio-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:seed": "node prisma/seed.js"
  },
  "dependencies": {
    "@prisma/client": "^5.14.0",
    "bcryptjs": "^2.4.3",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.3.1",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0",
    "nanoid": "^5.0.7",
    "node-sql-parser": "^4.18.0",
    "slugify": "^1.6.6",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "nodemon": "^3.1.4",
    "prisma": "^5.14.0"
  }
}
```

---

## 6. Frontend `package.json` — Tạo `frontend/package.json`

```json
{
  "name": "diagramio-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@codemirror/lang-sql": "^6.7.1",
    "@uiw/react-codemirror": "^4.23.0",
    "axios": "^1.7.2",
    "lucide-react": "^0.400.0",
    "nanoid": "^5.0.7",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-flow-renderer": "^10.3.17",
    "reactflow": "^11.11.4",
    "react-router-dom": "^6.24.0",
    "zustand": "^4.5.4"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.39",
    "tailwindcss": "^3.4.6",
    "vite": "^5.3.3"
  }
}
```

---

## 7. Files gốc cần tạo ngay

### `backend/src/config/prisma.js`
```js
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

### `backend/src/utils/response.js`
```js
// Chuẩn hóa tất cả API response
export const ok = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data })
}

export const created = (res, data, message = 'Created') => {
  return ok(res, data, message, 201)
}

export const fail = (res, message = 'Error', statusCode = 400, errors = null) => {
  return res.status(statusCode).json({ success: false, message, errors })
}

export const notFound = (res, message = 'Not found') => {
  return fail(res, message, 404)
}

export const unauthorized = (res, message = 'Unauthorized') => {
  return fail(res, message, 401)
}

export const forbidden = (res, message = 'Forbidden') => {
  return fail(res, message, 403)
}
```

### `backend/src/middleware/error.middleware.js`
```js
export const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.stack}`)

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'Duplicate entry', field: err.meta?.target })
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Record not found' })
  }

  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal server error'

  return res.status(statusCode).json({ success: false, message })
}
```

### `backend/src/app.js`
```js
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import 'dotenv/config'

import routes from './routes/index.js'
import { errorHandler } from './middleware/error.middleware.js'

const app = express()

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}))

// Rate limiting
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Logging
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'))

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }))

// API routes
app.use('/api', routes)

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }))

// Global error handler
app.use(errorHandler)

export default app
```

### `backend/src/server.js`
```js
import app from './app.js'

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📦 Environment: ${process.env.NODE_ENV}`)
})
```

### `backend/src/routes/index.js`
```js
import { Router } from 'express'
import authRoutes from './auth.routes.js'
import projectRoutes from './project.routes.js'
import diagramRoutes from './diagram.routes.js'
import parserRoutes from './parser.routes.js'
import exportRoutes from './export.routes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/projects', projectRoutes)
router.use('/diagrams', diagramRoutes)
router.use('/parser', parserRoutes)
router.use('/export', exportRoutes)

export default router
```

---

## 8. Middleware quan trọng

### `backend/src/middleware/auth.middleware.js`
```js
import jwt from 'jsonwebtoken'
import { unauthorized } from '../utils/response.js'

// Bắt buộc phải login
export const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return unauthorized(res)
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    return unauthorized(res, 'Invalid or expired token')
  }
}

// Có thể là guest, nếu có token thì gán user
export const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET)
    } catch { /* tiếp tục với guest */ }
  }
  next()
}
```

### `backend/src/middleware/guest.middleware.js`
```js
import { nanoid } from 'nanoid'

// Tự động tạo guest token cookie nếu chưa có
export const guestSession = (req, res, next) => {
  const cookieName = process.env.GUEST_COOKIE_NAME || 'diagramio_guest'
  if (!req.cookies[cookieName]) {
    const guestToken = nanoid(32)
    res.cookie(cookieName, guestToken, {
      httpOnly: true,
      maxAge: Number(process.env.GUEST_COOKIE_MAX_AGE) || 2592000000,
      sameSite: 'lax',
    })
    req.guestToken = guestToken
  } else {
    req.guestToken = req.cookies[cookieName]
  }
  next()
}
```

---

## 9. Thứ tự setup ban đầu (Agent thực hiện theo thứ tự này)

```bash
# Bước 1: Tạo toàn bộ cấu trúc thư mục
mkdir -p diagramio/backend/prisma/migrations
mkdir -p diagramio/backend/src/{config,routes,controllers,services,middleware,utils}
mkdir -p diagramio/frontend/src/{components/{Canvas,SqlEditor,TableBuilder,Toolbar,shared},pages,store,hooks,services,utils}

# Bước 2: Tạo tất cả files theo Section 3-8 ở trên

# Bước 3: Cài dependencies
cd diagramio/backend && npm install
cd ../frontend && npm install

# Bước 4: Tạo database MySQL
# Chạy lệnh SQL: CREATE DATABASE diagramio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Bước 5: Push schema lên DB
cd ../backend && npx prisma migrate dev --name init

# Bước 6: Verify
npx prisma studio  # Mở UI kiểm tra tables
```

---

## 10. Thứ tự build các module (sau khi setup xong)

> Làm tuần tự, mỗi module hoàn chỉnh trước khi qua module tiếp theo.

### Module 1 — Auth (`/api/auth`)
- `POST /auth/register` → hash password, tạo user, trả JWT
- `POST /auth/login` → verify, trả access token + refresh token cookie
- `POST /auth/refresh` → dùng refresh token cookie tạo access token mới
- `POST /auth/logout` → xóa refresh token
- `GET /auth/me` → trả user info (requireAuth)

### Module 2 — Projects (`/api/projects`)
- `POST /projects` → tạo project (guest hoặc user)
- `GET /projects` → list projects của user/guest
- `GET /projects/:id` → lấy project + diagrams
- `PATCH /projects/:id` → update name/description/isPublic
- `DELETE /projects/:id` → xóa project
- `POST /projects/:id/claim` → guest claim project về account sau khi đăng ký

### Module 3 — Diagrams (`/api/diagrams`)
- `POST /projects/:projectId/diagrams` → tạo diagram mới
- `GET /diagrams/:id` → lấy diagram đầy đủ (tables + columns + relationships)
- `PUT /diagrams/:id` → save toàn bộ diagram state (tables, columns, relationships)
- `DELETE /diagrams/:id` → xóa diagram

### Module 4 — SQL Parser (`/api/parser`)
- `POST /parser/sql-to-erd` → nhận SQL string + dialect, trả ERD JSON
- `POST /parser/erd-to-sql` → nhận ERD JSON + dialect, trả SQL string

### Module 5 — Export & Share (`/api/export`)
- `GET /projects/:id/export/sql?dialect=mysql` → tải file SQL
- `POST /projects/:id/share` → tạo shared link
- `GET /share/:token` → lấy diagram theo token (public)

### Module 6 — Versions & Templates
- `POST /projects/:id/versions` → tạo snapshot
- `GET /projects/:id/versions` → list versions
- `POST /projects/:id/versions/:versionId/restore` → rollback
- `GET /templates` → list templates
- `POST /templates/:id/use` → dùng template tạo project mới

---

## 11. ERD JSON Format chuẩn (dùng xuyên suốt project)

> Tất cả services phải dùng format này khi exchange data giữa parser, generator, và frontend.

```json
{
  "tables": [
    {
      "id": "tbl_uuid",
      "name": "users",
      "displayName": "Users",
      "color": "#6366f1",
      "position": { "x": 100, "y": 200 },
      "columns": [
        {
          "id": "col_uuid",
          "name": "id",
          "dataType": "INT",
          "isPrimary": true,
          "isAutoIncrement": true,
          "isNullable": false,
          "isUnique": true,
          "isForeign": false,
          "defaultValue": null,
          "comment": ""
        },
        {
          "id": "col_uuid2",
          "name": "email",
          "dataType": "VARCHAR(255)",
          "isPrimary": false,
          "isAutoIncrement": false,
          "isNullable": false,
          "isUnique": true,
          "isForeign": false,
          "defaultValue": null,
          "comment": ""
        }
      ]
    }
  ],
  "relationships": [
    {
      "id": "rel_uuid",
      "fromTableId": "tbl_uuid_posts",
      "fromColumnId": "col_uuid_user_id",
      "toTableId": "tbl_uuid_users",
      "toColumnId": "col_uuid_id",
      "type": "ONE_TO_MANY",
      "onDelete": "CASCADE",
      "onUpdate": "CASCADE",
      "label": ""
    }
  ]
}
```

---

## 12. API Response Format chuẩn

Tất cả API đều trả về theo format:

```json
// Success
{ "success": true, "message": "Success", "data": { ... } }

// Error
{ "success": false, "message": "Error message", "errors": null }
```

---

## 13. `.gitignore` cho cả project

```
node_modules/
.env
dist/
.DS_Store
prisma/migrations/
*.log
```

---

*Khi đọc xong file này, bắt đầu bằng Section 9 (Thứ tự setup ban đầu), sau đó build từng module theo Section 10.*
