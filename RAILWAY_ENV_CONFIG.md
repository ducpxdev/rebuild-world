# Railway Environment Configuration Guide

## 🔧 Cấu hình Environment Variables trên Railway

### 1. **Database Configuration**
Các biến này được tự động cấu hình bởi Railway khi bạn kết nối PostgreSQL:

```
DATABASE_URL=postgresql://user:password@host:port/database_name
DATABASE_PRIVATE_URL=postgresql://user:password@private-host:port/database_name
```

**Lưu ý**: Nếu bạn sử dụng Railway, hệ thống sẽ tự động cung cấp `DATABASE_URL` hoặc `DATABASE_PRIVATE_URL`. Ứng dụng sẽ tự động phát hiện và sử dụng.

### 2. **Google OAuth Configuration**

Bạn cần tạo Google OAuth credentials tại [Google Cloud Console](https://console.cloud.google.com):

```
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=https://rebuild-world.xyz/api/auth/google/callback
```

**Các bước tạo Google OAuth:**

1. Truy cập [Google Cloud Console](https://console.cloud.google.com)
2. Tạo dự án mới hoặc chọn dự án hiện tại
3. Bật Google+ API
4. Tạo OAuth 2.0 credentials (Web application)
5. Thêm Authorized redirect URIs:
   - Local: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://rebuild-world.xyz/api/auth/google/callback`

### 3. **JWT Configuration**

```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

**Khuyến nghị**: Tạo JWT_SECRET ngẫu nhiên dài (tối thiểu 32 ký tự)

### 4. **Session Configuration**

```
SESSION_SECRET=your-session-secret-key-change-this-in-production
```

### 5. **Frontend URL (cho Google OAuth redirect)**

```
FRONTEND_URL=https://rebuild-world.xyz
REACT_APP_API_URL=https://rebuild-world.xyz
```

### 6. **Node Environment**

```
NODE_ENV=production
PORT=3001
```

---

## 📋 Tóm tắt tất cả Environment Variables

```
# Database (tự động từ Railway)
DATABASE_URL=postgresql://...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://rebuild-world.xyz/api/auth/google/callback

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Session
SESSION_SECRET=your-session-secret-here

# URLs
FRONTEND_URL=https://rebuild-world.xyz
REACT_APP_API_URL=https://rebuild-world.xyz

# Environment
NODE_ENV=production
PORT=3001
```

---

## 🚀 Cấp nhật trên Railway:

1. Vào **Project Settings** → **Variables**
2. Thêm tất cả các biến ở trên (ngoại trừ `DATABASE_URL` - Railway tự động cung cấp)
3. Bấm **Deploy** để áp dụng thay đổi

---

## ✅ Kiểm tra kết nối:

Sau khi deploy, kiểm tra:

```bash
# 1. Health check
curl https://rebuild-world.xyz/api/health

# 2. Test login page loads
curl https://rebuild-world.xyz

# 3. Check Google OAuth endpoint exists
curl https://rebuild-world.xyz/api/auth/google
```

---

## 🔒 Bảo mật:

- ✅ **Không commit** `.env` files vào Git
- ✅ Sử dụng **strong random keys** cho JWT_SECRET và SESSION_SECRET
- ✅ **Luôn sử dụng HTTPS** trong production (Railway hỗ trợ tự động)
- ✅ **Giữ bí mật** GOOGLE_CLIENT_SECRET
