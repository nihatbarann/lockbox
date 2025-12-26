# 🔐 Lockbox Web

<div align="center">

<img src="https://img.shields.io/badge/🔐_Lockbox-Password_Manager-6366f1?style=for-the-badge&labelColor=1e1b4b" alt="Lockbox Logo" />

### Kurumsal Düzeyde Şifre Yöneticisi

Sıfır bilgi mimarisi ile güvenli şifre saklama çözümü

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org)
[![SQLite](https://img.shields.io/badge/SQLite-sql.js-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sql.js.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Özellikler](#-özellikler) • [Kurulum](#-kurulum) • [Yapılandırma](#️-yapılandırma) • [Veritabanı](#-veritabanı) • [API](#-api-dokümantasyonu)

</div>

---

## ✨ Özellikler

| Özellik | Açıklama |
|---------|----------|
| 🔒 **AES-256 Şifreleme** | Askeri düzeyde şifreleme algoritması |
| 🧠 **Sıfır Bilgi Mimarisi** | Veriler cihazınızda şifrelenir, sunucu asla görmez |
| 🔑 **PBKDF2 Anahtar Türetme** | 600.000 iterasyon ile güvenli anahtar üretimi |
| 💳 **Kredi Kartı Saklama** | Ödeme bilgilerini güvenle saklayın |
| 📝 **Güvenli Notlar** | Şifreli metin notları |
| 🔄 **Şifre Üretici** | Güçlü, benzersiz şifreler oluşturun |
| 🌙 **Karanlık/Aydınlık Tema** | Göz yormayan arayüz |
| 📱 **Responsive Tasarım** | Masaüstü, tablet ve mobil uyumlu |

---

## 🚀 Kurulum

### Gereksinimler

- **Node.js 18+** - [İndirin](https://nodejs.org)
- **npm** veya **yarn**
- **Git**

### 1. Depoyu Klonlayın

```bash
git clone https://github.com/kullanici-adi/lockbox-web.git
cd lockbox-web
```

### 2. Bağımlılıkları Yükleyin

```bash
# Tüm bağımlılıkları yükle
npm run install:all

# veya manuel olarak:
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 3. Sunucuyu Derleyin

```bash
cd server && npm run build && cd ..
```

### 4. Ortam Değişkenlerini Yapılandırın

```bash
# server klasöründe .env dosyası oluşturun
cp server/.env.example server/.env
```

`.env` dosyasını düzenleyin (aşağıdaki Yapılandırma bölümüne bakın).

### 5. Uygulamayı Başlatın

```bash
# Geliştirme modu (ayrı terminallerde)
# Terminal 1 - Backend:
cd server && npm run dev

# Terminal 2 - Frontend:
cd client && npm start
```

### 6. Tarayıcıda Açın

| Servis | URL |
|--------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:3001 |

---

## ⚙️ Yapılandırma

### Ortam Değişkenleri

`server/.env` dosyasını oluşturun ve aşağıdaki değişkenleri ayarlayın:

```env
# ==============================================
# SUNUCU YAPILANDIRMASI
# ==============================================

# Port numarası
PORT=3001

# Ortam (development / production)
NODE_ENV=development

# ==============================================
# GÜVENLİK AYARLARI
# ==============================================

# JWT Gizli Anahtarı (ÜRETİMDE DEĞİŞTİRİN!)
# En az 32 karakter uzunluğunda rastgele bir string kullanın
JWT_SECRET=uretimde-mutlaka-degistirin-uzun-rastgele-string-32karakter

# JWT Token Süresi
JWT_EXPIRES_IN=24h

# ==============================================
# VERİTABANI
# ==============================================

# SQLite veritabanı dosyası yolu
DB_PATH=./data/lockbox.db

# ==============================================
# RATE LIMITING (İSTEK SINIRLAMASI)
# ==============================================

# Pencere süresi (ms) - 15 dakika
RATE_LIMIT_WINDOW_MS=900000

# Maksimum istek sayısı
RATE_LIMIT_MAX_REQUESTS=100

# ==============================================
# ÜRETİM AYARLARI (Production)
# ==============================================

# Frontend URL (CORS için)
FRONTEND_URL=https://your-domain.com
```

### Güvenlik Tavsiyeleri

> ⚠️ **ÜRETİM ORTAMI İÇİN ÖNEMLİ:**

1. `JWT_SECRET` değerini mutlaka değiştirin (en az 32 karakter)
2. `NODE_ENV=production` olarak ayarlayın
3. HTTPS kullanın
4. `FRONTEND_URL` değerini doğru domain ile güncelleyin

---

## 💾 Veritabanı

### Veritabanı Mimarisi

Lockbox, **sql.js** kütüphanesi ile **SQLite** veritabanı kullanır. Bu sayede:

- ✅ Native bağımlılık yok (pure JavaScript)
- ✅ Kurulum gerektirmez
- ✅ Taşınabilir veritabanı dosyası
- ✅ Otomatik oluşturma

### Tablo Yapısı

```sql
-- Kullanıcılar Tablosu
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    encryption_key_salt TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Kasa Öğeleri Tablosu
CREATE TABLE vault_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,           -- 'password', 'note', 'card', 'identity'
    name TEXT NOT NULL,
    encrypted_data TEXT NOT NULL, -- AES-256 ile şifrelenmiş veri
    favorite INTEGER DEFAULT 0,
    folder_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Oturumlar Tablosu
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Ayarlar Tablosu
CREATE TABLE settings (
    user_id TEXT PRIMARY KEY,
    theme TEXT DEFAULT 'system',
    language TEXT DEFAULT 'tr',
    auto_lock_timeout INTEGER DEFAULT 15,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Veritabanı Konumu

```
server/
└── data/
    └── lockbox.db    # SQLite veritabanı dosyası
```

### Veritabanı Yedekleme

```bash
# Yedek alma
cp server/data/lockbox.db server/data/lockbox-backup-$(date +%Y%m%d).db

# Veritabanını sıfırlama (DİKKAT: Tüm veriler silinir!)
rm server/data/lockbox.db
```

### Veritabanı Bağlantısı

Veritabanı, sunucu başlatıldığında otomatik olarak başlatılır:

```typescript
// server/src/database/init.ts
import initSqlJs from 'sql.js';

// Veritabanı başlatma
const SQL = await initSqlJs();

// Dosya varsa yükle, yoksa yeni oluştur
if (fs.existsSync(dbPath)) {
  db = new SQL.Database(fs.readFileSync(dbPath));
} else {
  db = new SQL.Database();
}
```

---

## 📁 Proje Yapısı

```
lockbox-web/
├── 📁 client/                  # React Frontend
│   ├── 📁 public/              # Statik dosyalar
│   ├── 📁 src/
│   │   ├── 📁 components/      # UI bileşenleri
│   │   │   ├── AddItemModal.tsx
│   │   │   └── Layout.tsx
│   │   ├── 📁 pages/           # Sayfa bileşenleri
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   └── VaultPage.tsx
│   │   ├── 📁 services/        # API & şifreleme servisleri
│   │   │   ├── api.ts
│   │   │   └── encryption.ts
│   │   ├── 📁 store/           # Zustand state yönetimi
│   │   │   ├── authStore.ts
│   │   │   └── themeStore.ts
│   │   ├── App.tsx
│   │   └── index.tsx
│   └── package.json
│
├── 📁 server/                  # Node.js Backend
│   ├── 📁 src/
│   │   ├── 📁 database/        # SQLite başlatma
│   │   │   └── init.ts
│   │   ├── 📁 middleware/      # Express middleware
│   │   │   └── auth.ts
│   │   ├── 📁 routes/          # API endpoint'leri
│   │   │   ├── auth.ts
│   │   │   ├── settings.ts
│   │   │   ├── sync.ts
│   │   │   └── vault.ts
│   │   ├── 📁 services/        # İş mantığı
│   │   │   └── encryption.ts
│   │   └── index.ts            # Ana sunucu dosyası
│   ├── 📁 data/                # SQLite veritabanı
│   ├── .env.example            # Örnek ortam değişkenleri
│   └── package.json
│
├── .gitignore
├── LICENSE
├── package.json                # Root package.json
└── README.md
```

---

## 📡 API Dokümantasyonu

### Base URL

```
http://localhost:3001/api
```

### Kimlik Doğrulama

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/auth/register` | Yeni hesap oluştur |
| `POST` | `/auth/login` | Giriş yap |
| `POST` | `/auth/logout` | Çıkış yap |
| `GET` | `/auth/verify` | Oturumu doğrula |
| `POST` | `/auth/change-password` | Şifre değiştir |

### Kasa İşlemleri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/vault/items` | Tüm öğeleri getir |
| `GET` | `/vault/items/:id` | Tek öğe getir |
| `POST` | `/vault/items` | Yeni öğe oluştur |
| `PUT` | `/vault/items/:id` | Öğe güncelle |
| `DELETE` | `/vault/items/:id` | Öğe sil |

### Ayarlar

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/settings` | Ayarları getir |
| `PUT` | `/settings` | Ayarları güncelle |
| `GET` | `/settings/sessions` | Aktif oturumlar |

### Örnek İstekler

#### Kayıt Olma

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "GucluSifre123!"
  }'
```

#### Giriş Yapma

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "GucluSifre123!"
  }'
```

#### Kasa Öğesi Ekleme

```bash
curl -X POST http://localhost:3001/api/vault/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "password",
    "name": "GitHub",
    "encryptedData": "ENCRYPTED_DATA_STRING"
  }'
```

---

## 🛠️ Kullanılabilir Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Frontend ve backend'i geliştirme modunda başlat |
| `npm run server` | Sadece backend sunucusunu başlat |
| `npm run client` | Sadece frontend'i başlat |
| `npm run build` | Üretim için derle |
| `npm run install:all` | Tüm bağımlılıkları yükle |
| `npm run clean` | node_modules ve build dosyalarını sil |
| `npm run reset` | Temizle ve yeniden yükle |

---

## 🔐 Güvenlik

### Şifreleme Detayları

| Bileşen | Algoritma |
|---------|-----------|
| **Veri Şifreleme** | AES-256-GCM |
| **Anahtar Türetme** | PBKDF2-SHA256 (600.000 iterasyon) |
| **Şifre Hashleme** | bcrypt (12 salt round) |
| **Token İmzalama** | JWT (HS256) |

### Sıfır Bilgi Mimarisi

```
┌─────────────┐          ┌─────────────┐
│   İstemci   │          │   Sunucu    │
├─────────────┤          ├─────────────┤
│ Master Pass │──────────│     ❌      │  Sunucu asla görmez
│ Encryption  │──────────│ Şifreli     │  Sadece şifreli veri
│ Key (Local) │          │ Veri        │  saklanır
└─────────────┘          └─────────────┘
```

---

## 🐛 Sorun Giderme

### Port Zaten Kullanılıyor

```bash
# Windows - 3001 portunu kullanan işlemi bul ve sonlandır
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/macOS
lsof -i :3001
kill -9 <PID>
```

### Modül Bulunamıyor Hatası

```bash
npm run reset
```

### Veritabanı Hataları

```bash
# Veritabanını sil ve yeniden başlat
rm server/data/lockbox.db
npm run server
```

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır.

---

## 🙏 Teşekkürler

- [React](https://reactjs.org) - Frontend framework
- [Express](https://expressjs.com) - Backend framework
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [sql.js](https://sql.js.org) - SQLite in JavaScript
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [Lucide Icons](https://lucide.dev) - Iconlar

---

<div align="center">

**Güvenli şifre yönetimi için ❤️ ile yapıldı**

⭐ Yararlı bulduysan yıldız vermeyi unutma!

</div>
