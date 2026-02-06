# SPPI - Sistem PO Sayuran Management

Sistem manajemen **Purchase Order (PO)** terintegrasi untuk pengelolaan belanja sayuran dan bahan baku dapur. Sistem ini mendigitalkan seluruh alur kerja mulai dari pembuatan draft PO, persetujuan manajer, transfer dana oleh keuangan, hingga eksekusi belanja di lapangan.

![SPPI Dashboard](https://via.placeholder.com/800x400?text=SPPI+System+Dashboard)

## 🌟 Fitur Unggulan

- **Workflow Approval Bertingkat**: Admin -> Manajer -> Keuangan -> Lapangan.
- **Analisis Profit & Margin**: Perhitungan otomatis `Modal`, `Harga Jual`, `Profit`, dan `% Margin` secara real-time.
- **Manajemen Multi-Dapur**: Pengelolaan order spesifik untuk masing-masing cabang dapur.
- **Sistem Keuangan Transparan**: Tracking transfer dana (Partial/Full) dengan bukti upload.
- **Mobile-Ready**: Interface responsif untuk tim lapangan saat belanja.

---

## 🏗️ Teknologi

### Frontend

- **Framework**: [Vue.js 3](https://vuejs.org/) (Composition API)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide Vue Next](https://lucide.dev/)
- **HTTP Client**: Axios
- **State Management**: Pinia

### Backend

- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: MySQL
- **ORM/Query**: `mysql2` (Raw Queries & Transactions)
- **File Storage**: Cloudinary (Upload bukti transfer & belanja)
- **Auth**: JWT (JSON Web Tokens)

---

## 👥 Hak Akses & Peran

| Role         | Deskripsi & Wewenang                                                         |
| :----------- | :--------------------------------------------------------------------------- |
| **ADMIN**    | Membuat Draft PO, Mengelola Master Dapur/User, Melihat Laporan.              |
| **MANAJER**  | Review PO, Menentukan Harga Jual, Approve/Reject PO.                         |
| **KEUANGAN** | Melihat PO Approved, Melakukan Transfer Dana (Modal), Upload Bukti Transfer. |
| **SHOPPER** | Melihat Daftar Belanja, Upload Bukti Belanja & Harga Real.                   |

---

## 🔄 Alur Kerja Sistem (Workflow)

### 1. Pembuatan PO (Admin)

- Admin memilih **Dapur Tujuan**.
- Input list barang, Qty, dan **Harga Modal**.
- Sistem menyimpan sebagai `DRAFT`.
- Admin mengajukan ke Manajer (`SUBMIT`).

### 2. Approval (Manajer)

- Manajer mereview item dan modal.
- Manajer menentukan **Harga Jual** ke customer.
- Sistem menghitung **Profit** dan **Margin**.
- Jika OK, status berubah menjadi `APPROVED`.

### 3. Transfer Dana (Keuangan)

- Keuangan melihat daftar PO `APPROVED`.
- Sistem menampilkan **Total Modal** (HPP) yang harus ditransfer.
- Keuangan bisa transfer **Partial** (sebagian item) atau **Full**.
- Upload bukti transfer. Status item berubah menjadi `PAID`.

### 4. Belanja (Shopper)

- Tim lapangan melihat item yang sudah dibayar (`PAID`).
- Melakukan belanja dan input **Harga Real** + Upload Foto Barang.
- Jika semua item selesai, status PO menjadi `BELANJA_SELESAI`.

---

## 💾 Struktur Database

Tabel utama dalam sistem:

- `users`: Data pengguna dan role.
- `dapurs`: Master data lokasi dapur.
- `purchase_orders`: Header PO (Tanggal, Status, Total).
- `po_items`: Detail barang, harga modal, harga jual, profit.
- `po_transfers`: Riwayat transfer dana per batch.

---

## 🚀 Panduan Instalasi

### Prasyarat

- Node.js (v16+)
- MySQL Database

### 1. Setup Database

Import file schema database ke MySQL:

```bash
# Gunakan file sql terbaru di folder database/
mysql -u root -p sppi < database/database_complete_schema.sql
```

### 2. Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env sesuaikan dengan config DB dan Cloudinary.
npm install
npm run dev
```

### 3. Setup Frontend

```bash
cd frontend
cp .env.example .env
# Pastikan VITE_API_URL mengarah ke backend (misal: http://localhost:3000/api)
npm install
npm run dev
```

### 4. Login Default

| User     | Username   | Password      |
| :------- | :--------- | :------------ |
| Admin    | `admin`    | `password123` |
| Manajer  | `manajer`  | `password123` |
| Keuangan | `keuangan` | `password123` |
| Lapangan | `lapangan` | `password123` |

---

## 📁 Struktur Folder

```
sppi/
├── backend/            # Express API Server
│   ├── src/
│   │   ├── config/     # Database config
│   │   ├── routes/     # API Routes
│   │   └── ...
├── frontend/           # Vue Admin Dashboard
│   ├── src/
│   │   ├── views/      # Halaman per role
│   │   ├── components/ # Reusable UI components
│   │   └── ...
└── database/           # SQL Migration files & Docs
```

---

## 📝 Catatan Penting

- **Perhitungan Profit**: Profit = (Qty × Harga Jual) - (Qty × Harga Modal).
- **Transfer**: Nominal yang ditransfer finance adalah **Total Modal**, bukan Total Jual.
