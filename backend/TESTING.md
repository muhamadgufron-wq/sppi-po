# 🧪 Testing Guide - Backend API

## Prerequisites

1. **MySQL** harus sudah terinstall dan running
2. **Node.js** v18+ terinstall
3. Dependencies sudah terinstall (`npm install`)

## Step-by-Step Testing

### 1️⃣ Setup Database

**Option A: Menggunakan Script (Recommended)**

```bash
cd backend
.\setup-db.bat
```

Script akan meminta username dan password MySQL Anda.

**Option B: Manual**

```bash
# Login ke MySQL
mysql -u root -p

# Jalankan migration
source d:/Projects/sppi/database/migrations/001_create_tables.sql

# Jalankan seed data
source d:/Projects/sppi/database/seeds/001_seed_data.sql
```

### 2️⃣ Konfigurasi Environment

Edit file `backend/.env` dan sesuaikan password MySQL:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_here  # ⚠️ UBAH INI!
DB_NAME=sppi_po
```

### 3️⃣ Jalankan Backend Server

Buka terminal pertama:

```bash
cd backend
npm run dev
```

Server akan berjalan di `http://localhost:3000`

Tunggu sampai muncul:

```
✅ Database connected successfully
🚀 SPPI Purchase Order System
📡 Server running on: http://localhost:3000
```

### 4️⃣ Jalankan Test Suite

Buka terminal kedua (biarkan server tetap running):

```bash
cd backend
npm test
```

## Test Coverage

Test suite akan menjalankan 6 test scenarios:

### ✅ Test 1: Authentication

- Login sebagai 4 role (Admin, Manajer, Keuangan, Lapangan)
- Verify JWT token generation
- Get current user info

### ✅ Test 2: Create PO (Admin)

- Create PO dengan data valid
- AI validation check
- Submit PO untuk approval

### ✅ Test 3: Approval (Manajer)

- Get pending approvals
- AI price analysis
- Approve PO

### ✅ Test 4: Transfer (Keuangan)

- Get pending transfers
- Upload bukti transfer
- AI validation check
- Process transfer

### ✅ Test 5: Shopping (Lapangan)

- Get active shopping
- Update qty & harga real
- Upload bukti belanja
- Complete shopping
- AI anomaly detection

### ✅ Test 6: AI Recommendations

- Get AI recommendations per PO
- Get price insights & trends

## Expected Output

Jika semua test berhasil, Anda akan melihat:

```
==========================================================
TEST SUMMARY
==========================================================
Total Tests: 6
✓ Passed: 6

==========================================================

🎉 ALL TESTS PASSED! Backend API is working correctly.
```

## Manual Testing dengan Postman/Thunder Client

### 1. Login

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}
```

Copy `token` dari response untuk request selanjutnya.

### 2. Create PO

```http
POST http://localhost:3000/api/po
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "tanggal_po": "2025-12-23",
  "items": [
    {
      "nama_barang": "Tomat",
      "kategori_sayuran": "Buah",
      "qty_estimasi": 50,
      "satuan": "kg",
      "harga_estimasi": 15000
    }
  ],
  "catatan_admin": "Test PO"
}
```

### 3. Get PO List

```http
GET http://localhost:3000/api/po
Authorization: Bearer YOUR_TOKEN_HERE
```

## Troubleshooting

### ❌ Database connection failed

- Pastikan MySQL running
- Check username/password di `.env`
- Pastikan database `sppi_po` sudah dibuat

### ❌ Port 3000 already in use

Edit `backend/.env`:

```env
PORT=3001
```

### ❌ Test failed: Authentication

- Pastikan seed data sudah dijalankan
- Check password hash di database

### ❌ File upload failed

- Pastikan folder `uploads` ada di `backend/`
- Check file permissions

## Default Users

| Username | Password    | Role     |
| -------- | ----------- | -------- |
| admin    | password123 | ADMIN    |
| manajer  | password123 | MANAJER  |
| keuangan | password123 | KEUANGAN |
| lapangan | password123 | LAPANGAN |

## Next Steps

Setelah test berhasil:

1. ✅ Backend API verified working
2. 🔄 Lanjut develop frontend Vue.js
3. 🔄 Integration testing frontend-backend
4. 🔄 Deploy to production

---

**Happy Testing! 🚀**
