# Backend API - Purchase Order System

Backend API untuk sistem Purchase Order distribusi sayuran dengan AI Agent.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Setup database MySQL dan buat file `.env`:

```bash
cp .env.example .env
```

3. Edit `.env` sesuai konfigurasi database Anda

4. Jalankan migration:

```bash
mysql -u root -p < ../database/migrations/001_create_tables.sql
mysql -u root -p < ../database/seeds/001_seed_data.sql
```

5. Jalankan server:

```bash
npm run dev
```

## Default Users

Semua user memiliki password: `password123`

- **Admin**: `admin` / `password123`
- **Manajer**: `manajer` / `password123`
- **Keuangan**: `keuangan` / `password123`
- **Lapangan**: `lapangan` / `password123`

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Purchase Order (Admin)

- `POST /api/po` - Create PO
- `GET /api/po` - Get all POs
- `GET /api/po/:id` - Get PO detail
- `POST /api/po/:id/submit` - Submit for approval
- `DELETE /api/po/:id` - Delete PO (DRAFT only)

### Approval (Manajer)

- `GET /api/approval/pending` - Get pending approvals
- `POST /api/approval/:poId/process` - Approve/Reject PO

### Transfer (Keuangan)

- `GET /api/transfer/pending` - Get pending transfers
- `POST /api/transfer/:poId` - Process transfer (with file upload)

### Shopping (Lapangan)

- `GET /api/shopping/active` - Get active shopping
- `POST /api/shopping/:poId/items` - Update shopping items
- `POST /api/shopping/:poId/proof` - Upload shopping proof
- `POST /api/shopping/:poId/complete` - Complete shopping

### AI Recommendations

- `GET /api/ai/recommendations/:poId` - Get AI recommendations
- `GET /api/ai/price-insights/:itemName` - Get price insights
- `PUT /api/ai/recommendations/:id/read` - Mark as read

## AI Agent Features

Setiap role memiliki AI Agent yang memberikan:

- **STATUS**: Status rekomendasi
- **ANALISIS**: Poin-poin analisis
- **REKOMENDASI**: Tindakan yang disarankan
- **CATATAN**: Risiko atau anomali (jika ada)

## Tech Stack

- Node.js + Express
- TypeScript
- MySQL
- JWT Authentication
- Multer (File Upload)
- Zod (Validation)
