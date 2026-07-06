# Deploy qua GitHub (Free)

Hướng dẫn deploy **Frontend → Vercel** và **Backend → Render** từ repo GitHub.

## Tổng quan

```
GitHub: CungNS1990/Crypto-analytics
    │
    ├── Render  → Backend API  (FastAPI, free tier)
    └── Vercel  → Frontend     (Next.js, free tier)
```

| | Render (Backend) | Vercel (Frontend) |
|---|---|---|
| Free | Có (sleep sau ~15 phút idle) | Có |
| URL mẫu | `https://crypto-analytics-api.onrender.com` | `https://crypto-analytics.vercel.app` |
| Auto deploy | Push lên `main` | Push lên `main` |

---

## Bước 1 — Deploy Backend (Render)

1. Đăng nhập [render.com](https://render.com) → **New +** → **Blueprint**
2. Connect GitHub repo `Crypto-analytics`
3. Render đọc file `render.yaml` ở root repo → bấm **Apply**
4. Khi tạo service, Render hỏi biến **`CORS_ORIGINS`** — tạm điền:
   ```
   http://localhost:3000
   ```
   (Sẽ cập nhật thêm URL Vercel ở bước 3)
5. Đợi deploy xong → copy **URL backend**, ví dụ:
   ```
   https://crypto-analytics-api.onrender.com
   ```
6. Kiểm tra: mở `https://YOUR-API.onrender.com/health` → phải thấy `{"status":"ok"}`

### Render free tier — lưu ý

- Lần đầu truy cập sau khi sleep: chờ **30–60 giây** để service wake up
- `paper_session.json` **không persist** khi Render restart → paper trade reset, OK để test
- WebSocket có thể không ổn định trên free tier; dashboard vẫn chạy qua REST API

---

## Bước 2 — Deploy Frontend (Vercel)

1. Đăng nhập [vercel.com](https://vercel.com) → **Add New → Project**
2. Import GitHub repo `Crypto-analytics`
3. Cấu hình project:

   | Setting | Value |
   |---|---|
   | **Root Directory** | `frontend` |
   | **Framework Preset** | Next.js (auto) |
   | **Build Command** | `npm run build` (default) |
   | **Output Directory** | `.next` (default) |

4. **Environment Variables** — thêm:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://YOUR-API.onrender.com` |

   (URL Render từ bước 1, **không** có dấu `/` cuối)

5. Bấm **Deploy** → copy URL frontend, ví dụ:
   ```
   https://crypto-analytics.vercel.app
   ```

---

## Bước 3 — Cập nhật CORS (bắt buộc)

Sau khi có URL Vercel, quay lại **Render Dashboard**:

1. Service `crypto-analytics-api` → **Environment**
2. Sửa `CORS_ORIGINS`:
   ```
   http://localhost:3000,https://crypto-analytics.vercel.app
   ```
   (Thay bằng URL Vercel thật của bạn)
3. **Save** → Render tự redeploy

---

## Bước 4 — Kiểm tra

1. Mở URL Vercel → Dashboard load giá BTC/ETH/BNB/XRP
2. Vào **Paper Trade Bot** → nhập vốn → **Bắt đầu bot**
3. Nếu lỗi CORS trên browser console → kiểm tra lại `CORS_ORIGINS` trên Render

---

## Deploy thủ công (không dùng Blueprint)

Nếu không dùng `render.yaml`:

| Field | Value |
|---|---|
| Root Directory | `backend` |
| Runtime | Python 3 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health Check | `/health` |

---

## Auto deploy từ GitHub

Sau khi setup xong, mỗi lần `git push origin main`:

- **Render** tự build & deploy backend
- **Vercel** tự build & deploy frontend

---

## Troubleshooting

| Vấn đề | Cách xử lý |
|---|---|
| Frontend không load giá | Kiểm tra `NEXT_PUBLIC_API_URL` trên Vercel |
| CORS error | Thêm URL Vercel vào `CORS_ORIGINS` trên Render |
| API chậm lần đầu | Render free đang wake up — đợi ~1 phút |
| WS offline trên production | Bình thường trên free tier — dùng REST polling |
| Paper trade mất session | Render restart xóa file local — chấp nhận khi test |

---

## Chi phí

**$0** — đủ để test paper trade bot và demo.
