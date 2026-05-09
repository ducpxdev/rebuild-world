# 📖 Hướng Dẫn Cách Chạy Web Project - Rebuild World

Đây là hướng dẫn chi tiết cách chạy dự án web full-stack này. Dự án gồm hai phần: **Client** (React + Vite) và **Server** (Express.js).

---

## 📋 Yêu Cầu Trước Khi Bắt Đầu

- **Node.js**: Phiên bản 16+ (khuyến nghị 18+)
- **npm**: Phiên bản 8+ (đi kèm với Node.js)
- **Git**: Để clone dự án (nếu cần)

### Cài Đặt Node.js & npm

**Trên macOS (sử dụng Homebrew):**
```bash
brew install node
```

**Trên Windows:**
Tải từ [nodejs.org](https://nodejs.org/) và cài đặt

**Trên Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install nodejs npm
```

Kiểm tra cài đặt:
```bash
node --version
npm --version
```

---

## 🚀 Cách Chạy Ở Chế Độ Phát Triển (Development)

### Bước 1️⃣: Mở Terminal & Đi Tới Thư Mục Dự Án

```bash
cd /đường/dẫn/đến/web_project
```

### Bước 2️⃣: Cài Đặt Dependencies

**Cài server dependencies:**
```bash
npm install --prefix server
```

**Cài client dependencies:**
```bash
npm install --prefix client
```

Đợi cho đến khi cài đặt xong (mất khoảng 2-5 phút tùy tốc độ mạng).

### Bước 3️⃣: Cấu Hình File `.env` Cho Server

**Tạo file `.env` trong thư mục server:**
```bash
cd server
```

Tạo file mới tên là `.env` và thêm nội dung:
```
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rebuild_world
JWT_SECRET=your-secret-key-12345
CLIENT_URL=http://localhost:5173

# Email Configuration (nếu cần gửi email)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

**Lưu file**.

### Bước 4️⃣: Chạy Server (Terminal 1)

**Đi về thư mục gốc:**
```bash
cd ..
```

**Chạy server ở chế độ phát triển (tự động reload khi code thay đổi):**
```bash
npm run dev --prefix server
```

✅ Kết quả thành công:
```
Server running on http://localhost:5000
```

**Để lại terminal này chạy, mở terminal mới cho client.**

### Bước 5️⃣: Chạy Client (Terminal 2 - Terminal Mới)

**Đi tới thư mục gốc:**
```bash
cd /đường/dẫn/đến/web_project
```

**Chạy client dev server:**
```bash
npm run dev --prefix client
```

✅ Kết quả thành công:
```
  VITE v5.0.0  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

### Bước 6️⃣: Mở Trình Duyệt & Xem Web

Mở trình duyệt web (Chrome, Firefox, Safari, Edge) và truy cập:

```
http://localhost:5173
```

🎉 **Web sẽ hiển thị!**

---

## 📝 Tóm Tắt Các Lệnh Cụ Thể

### Lần Đầu Chạy (Complete Setup)

```bash
# 1. Đi tới thư mục dự án
cd /đường/dẫn/đến/web_project

# 2. Cài dependencies
npm install --prefix server
npm install --prefix client

# 3. Cấu hình .env
cd server
# Tạo file .env với nội dung bên trên
cd ..

# 4. Terminal 1: Chạy server
npm run dev --prefix server

# 5. Terminal 2 (NEW): Chạy client
npm run dev --prefix client

# 6. Truy cập: http://localhost:5173
```

### Lần Tiếp Theo (Nếu đã cài dependencies)

**Terminal 1:**
```bash
npm run dev --prefix server
```

**Terminal 2:**
```bash
npm run dev --prefix client
```

**Truy cập:** `http://localhost:5173`

---

## 🔄 Tắt/Khởi Động Lại Các Service

**Để dừng server hoặc client:**
- Nhấn `Ctrl + C` trong terminal tương ứng

**Để chạy lại:**
```bash
npm run dev --prefix server
npm run dev --prefix client
```

---

## 🔨 Build Cho Production

### 1️⃣ Build Client

```bash
npm run build --prefix client
```

Tệp đã build sẽ nằm trong `client/dist/`

### 2️⃣ Chạy Server + Client Phục Vụ Static Files

```bash
npm start --prefix server
```

Server sẽ phục vụ static files từ `client/dist/`

---

## 🌍 Chạy Toàn Bộ Dự Án (One Command)

Từ thư mục gốc, chạy lệnh build toàn bộ (như khi deploy):

```bash
npm install
npm start
```

Hoặc nếu chỉ muốn build:
```bash
npm run build
```

---

## 📁 Cấu Trúc Dự Án

```
web_project/
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/         # Các trang
│   │   ├── components/    # React components
│   │   ├── context/       # Context API (Auth)
│   │   ├── lib/           # API calls (axios)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── server/                 # Backend (Express.js)
│   ├── src/
│   │   ├── index.js       # Entry point
│   │   ├── database.js    # Database config
│   │   ├── mailer.js      # Email config
│   │   ├── middleware/    # Auth, upload middleware
│   │   └── routes/        # API routes
│   ├── uploads/           # Folder lưu file upload
│   ├── package.json
│   └── .env              # File cấu hình (tạo tay)
│
├── package.json           # Root package.json
├── Procfile              # Config cho Render deployment
└── README.md
```

---

## 🔑 Các Lệnh Hữu Ích

| Lệnh | Mô Tả |
|------|-------|
| `npm run dev --prefix server` | Chạy server ở chế độ phát triển (auto-reload) |
| `npm start --prefix server` | Chạy server (production mode) |
| `npm run dev --prefix client` | Chạy client dev server |
| `npm run build --prefix client` | Build client cho production |
| `npm run lint --prefix client` | Kiểm tra code style |
| `npm run build` | Build toàn bộ dự án |

---

## ⚙️ Cấu Hình API

Client gửi request đến server thông qua Axios. File config: `client/src/lib/api.ts`

Đảm bảo URL API trong client khớp với server URL:
- **Development**: `http://localhost:5000`
- **Production**: URL của server trên Render

---

## 🐛 Gỡ Lỗi Thường Gặp

### ❌ Lỗi: "Command not found: npm"
**Giải pháp**: Cài đặt Node.js

### ❌ Lỗi: "Port 5000 already in use"
**Giải pháp**: Dùng port khác hoặc tìm và kill process đang dùng port 5000

```bash
# macOS/Linux
lsof -i :5000
kill -9 <PID>

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### ❌ Lỗi: "Cannot find module"
**Giải pháp**: Chạy lại `npm install`

### ❌ Client không kết nối được Server
**Giải pháp**: 
- Kiểm tra server đang chạy
- Kiểm tra API URL trong `client/src/lib/api.ts`
- Kiểm tra CORS configuration trong `server/src/index.js`

---

## 📦 Dependencies Chính

### Server
- **Express**: Web framework
- **bcryptjs**: Hash password
- **jsonwebtoken**: JWT authentication
- **nodemailer**: Gửi email
- **multer**: Upload file
- **sql.js**: Database (in-memory SQLite)

### Client
- **React 19**: UI library
- **Vite**: Build tool
- **React Router**: Navigation
- **Axios**: HTTP client
- **Tailwind CSS**: Styling
- **TypeScript**: Type safety

---

## 🌐 Triển Khai Lên Render

Xem file: `RENDER_DEPLOYMENT_STEPS.md` và `RENDER_TROUBLESHOOTING.md`

---

## 💡 Tips

1. **Phát triển nhanh hơn**: Chạy client và server ở 2 terminal khác nhau
2. **Kiểm tra lỗi**: Mở Developer Console (F12) ở browser để xem lỗi frontend
3. **Kiểm tra API**: Dùng Postman hoặc Thunder Client để test API
4. **Hot Reload**: Client Vite tự động reload khi code thay đổi

---

## ❓ Liên Hệ / Hỗ Trợ

Nếu gặp vấn đề, kiểm tra:
- File `.env` có đúng không
- Tất cả dependencies đã cài chưa
- Server đang chạy không
- Port không bị chiếm bởi ứng dụng khác

---

**Chúc bạn phát triển vui vẻ! 🎉**
