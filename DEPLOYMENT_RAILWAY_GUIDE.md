# 🚀 Hướng dẫn Deploy Rebuild World lên Railway

## ✨ Tính năng đã cập nhật:

✅ **Google OAuth Login/Register** - Người dùng có thể đăng ký qua Google  
✅ **Email + Password Registration** - Vẫn hỗ trợ đăng ký trực tiếp  
✅ **Persistent Database** - PostgreSQL trên Railway giữ lại tất cả dữ liệu  
✅ **Account Data Persistence** - Tài khoản, lượt xem, bình luận,... được lưu trữ  

---

## 📋 Điều kiện tiên quyết:

1. **Railway Account** - Đã có tài khoản Railway
2. **Google OAuth Credentials** - Từ Google Cloud Console
3. **Domain** - `rebuild-world.xyz` (đã có trên Railway)
4. **Database** - PostgreSQL `rebuild-world-db` (đã có trên Railway)

---

## 🔧 Bước 1: Tạo Google OAuth Credentials

### 1.1 Vào Google Cloud Console

1. Truy cập [Google Cloud Console](https://console.cloud.google.com)
2. Tạo dự án mới (hoặc chọn dự án hiện tại)
3. Tên dự án: "Rebuild World"

### 1.2 Bật Google+ API

1. Vào **APIs & Services** → **Library**
2. Tìm "Google+ API" → Click → **Enable**

### 1.3 Tạo OAuth 2.0 Credentials

1. Vào **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Chọn **Web application**
4. Tên: "Rebuild World Web"
5. **Authorized JavaScript origins**:
   ```
   http://localhost:3001
   https://rebuild-world.xyz
   ```
6. **Authorized redirect URIs**:
   ```
   http://localhost:3001/api/auth/google/callback
   https://rebuild-world.xyz/api/auth/google/callback
   ```
7. Click **Create**
8. **Lưu lại**:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

---

## 🚆 Bước 2: Cấu hình Railway

### 2.1 Kết nối GitHub Repository

1. Vào [Railway Dashboard](https://railway.app/dashboard)
2. Click **New Project**
3. Chọn **Deploy from GitHub**
4. Kết nối với GitHub repository của bạn
5. Chọn repository `web_project`

### 2.2 Thêm PostgreSQL Database

1. Click **Add Plugin**
2. Chọn **PostgreSQL**
3. Tên: `rebuild-world-db`
4. Railway sẽ tự động tạo `DATABASE_URL`

### 2.3 Cấu hình Environment Variables

Vào **Project** → **Variables** → Thêm các biến sau:

```
# Google OAuth - từ Google Cloud Console
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALLBACK_URL=https://rebuild-world.xyz/api/auth/google/callback

# JWT Secret - Tạo chuỗi ngẫu nhiên dài
JWT_SECRET=your-random-secret-key-min-32-chars-example-abcdef1234567890
JWT_EXPIRES_IN=7d

# Session Secret
SESSION_SECRET=your-session-secret-key-min-20-chars

# Frontend URLs
FRONTEND_URL=https://rebuild-world.xyz
REACT_APP_API_URL=https://rebuild-world.xyz

# Environment
NODE_ENV=production
PORT=3001
```

**Lưu ý:**
- `DATABASE_URL` được Railway tự động tạo - **KHÔNG cần thêm**
- Các biến khác **phải được thêm thủ công**

### 2.4 Cấu hình Domain

1. Vào **Deployment** → **Settings** → **Domain**
2. Click **Custom Domain**
3. Nhập `rebuild-world.xyz`
4. Railway sẽ cấp chứng chỉ SSL tự động

### 2.5 Deploy

1. Railway sẽ tự động deploy khi bạn push code lên GitHub
2. Hoặc click **Deployments** → **Deploy** để deploy thủ công

---

## 🧪 Bước 3: Kiểm tra và Test

### 3.1 Kiểm tra Server

```bash
# Health check
curl https://rebuild-world.xyz/api/health

# Xem kết nối database
# Kiểm tra logs trên Railway Dashboard
```

### 3.2 Test Google Login

1. Truy cập `https://rebuild-world.xyz/login`
2. Click **Sign in with Google**
3. Chọn Google account
4. Kiểm tra redirect về trang chủ

### 3.3 Test Email + Password Register

1. Truy cập `https://rebuild-world.xyz/register`
2. Điền thông tin
3. Click **Create Account**
4. Kiểm tra tài khoản được tạo

### 3.4 Kiểm tra Data Persistence

1. Tạo tài khoản, đăng nhập, tạo story
2. Chờ Railway redeploy (hoặc rebuild manually)
3. Kiểm tra tài khoản, story, lượt xem vẫn còn

---

## 📊 Database Structure

Bảng `users` được tự động tạo với các columns:

```sql
- id (TEXT PRIMARY KEY)
- username (TEXT UNIQUE)
- email (TEXT UNIQUE)
- password_hash (TEXT, NULL nếu Google OAuth)
- google_id (TEXT UNIQUE, NULL nếu email/password)
- provider (TEXT: 'local' hoặc 'google')
- avatar_url (TEXT)
- bio (TEXT)
- is_admin (INTEGER)
- is_verified (INTEGER)
- created_at (BIGINT)
```

---

## 🔍 Troubleshooting

### ❌ "Google OAuth not configured"

**Giải pháp**: Kiểm tra Railway Variables có:
- ✅ `GOOGLE_CLIENT_ID`
- ✅ `GOOGLE_CLIENT_SECRET`
- ✅ `GOOGLE_CALLBACK_URL` = `https://rebuild-world.xyz/api/auth/google/callback`

### ❌ "Database connection failed"

**Giải pháp**: 
1. Kiểm tra PostgreSQL plugin đã kích hoạt
2. Xem logs: Railway sẽ tự động set `DATABASE_URL`
3. Nếu không có, thêm thủ công từ plugin settings

### ❌ "Login redirects to login page"

**Giải pháp**:
1. Kiểm tra `JWT_SECRET` được cấu hình
2. Kiểm tra token được lưu vào `localStorage`
3. Xem browser DevTools → Application → Storage

### ❌ "Data mất sau rebuild"

**Giải pháp**:
- Nếu sử dụng SQLite (cũ): ❌ Dữ liệu KHÔNG được lưu
- Nếu sử dụng PostgreSQL trên Railway (mới): ✅ Dữ liệu được lưu trữ bền vững

---

## 🔒 Bảo mật

✅ **Làm ngay**:
1. Thay `JWT_SECRET` bằng chuỗi ngẫu nhiên dài (tối thiểu 32 ký tự)
2. Thay `SESSION_SECRET` bằng chuỗi ngẫu nhiên dài
3. **Không** commit `.env` vào Git
4. Sử dụng **HTTPS** (Railway cấp tự động)
5. Giữ `GOOGLE_CLIENT_SECRET` bí mật (không share)

---

## 📚 Tài liệu tham khảo

- [Railway Docs](https://docs.railway.app)
- [Google OAuth Docs](https://developers.google.com/identity/protocols/oauth2)
- [PostgreSQL Docs](https://www.postgresql.org/docs)

---

## ✅ Checklist Trước Khi Go Live

- [ ] Google OAuth credentials tạo xong
- [ ] Railway environment variables cấu hình đầy đủ
- [ ] PostgreSQL database kết nối thành công
- [ ] Domain `rebuild-world.xyz` cấu hình
- [ ] SSL certificate hoạt động (Railway tự động)
- [ ] Test login/register hoạt động
- [ ] Test data persistence (tạo account → rebuild → account vẫn còn)
- [ ] Logs không có lỗi
- [ ] Backup database nếu cần

---

## 🎉 Done!

Bạn đã sẵn sàng! Ứng dụng của bạn bây giờ:
- ✅ Hỗ trợ Google OAuth login/register
- ✅ Hỗ trợ email + password register
- ✅ Lưu trữ dữ liệu bền vững trên PostgreSQL
- ✅ Hoạt động trên domain `rebuild-world.xyz`

**Tiếp theo**: Mở rộng tính năng, tối ưu hóa hiệu suất, thêm tính năng mới!

