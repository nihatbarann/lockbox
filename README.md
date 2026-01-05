# 🔐 Lockbox - Enterprise Password Manager

Lockbox, işletmeler ve bireyler için tasarlanmış güvenli, açık kaynaklı bir şifre yöneticisidir. AES-256 encryption teknolojisi ile verileriniz end-to-end şifrelenerek saklanır. Modern web arayüzü sayesinde tüm şifrelerinizi, kredi kartı bilgilerinizi, kimlik bilgilerinizi ve güvenli notlarınızı merkezi bir platformdan yönetebilirsiniz.

## ✨ Özellikler

- **🔒 Güvenli Depolama**: AES-256 istemci tarafı şifreleme
- **📱 Şifre Yönetimi**: Şifreleri kategorilere ayırarak organize edin
- **💳 Kart Yönetimi**: Kredi kartı bilgilerinizi güvenli tutun
- **👤 Kimlik Bilgileri**: Ulusal kimlik, pasaport ve diğer belgeleri saklayın
- **📝 Güvenli Notlar**: Özel notlarınızı şifreli olarak depolayın
- **🎨 Modern UI**: Responsive ve kullanıcı dostu arayüz
- **🔐 JWT Kimlik Doğrulama**: Güvenli oturum yönetimi
- **⚡ Hızlı Arama**: İçeriğinizde anında arama yapın
- **⭐ Favoriler**: Sık kullandığınız öğeleri hızlıca erişin
- **📊 İstatistikler**: Şifre güvenliği analizi ve kullanım istatistikleri
- **🔄 Import/Export**: Verilerinizi güvenli şekilde dışa aktarın
- **📱 Responsive**: Mobil, tablet ve masaüstü cihazlarda çalışır

## 🚀 Hızlı Başlangıç

### Sistem Gereksinimleri

- **Node.js**: 18.0.0 veya üzeri
- **npm**: 9.0.0 veya üzeri
- **Modern Web Tarayıcısı**: Chrome, Firefox, Safari, Edge (güncel versiyonlar)

### Kurulum Adımları

#### 1. Projeyi Hazırlayın

```bash
# Projeyi klonlayın
git clone https://github.com/nihatbarann/lockbox.git
cd lockbox

# Tüm bağımlılıkları yükleyin (sunucu ve istemci)
npm run setup
```

#### 2. Geliştirme Ortamında Çalıştırın

```bash
# Sunucu (3001 portunda) ve istemci (3000 portunda) başlatın
npm run dev
```

Tarayıcınızda **http://localhost:3000** adresini açın ve başlayın!

#### 3. Kayıt Olun ve Kullanın

1. **Register** butonuna tıklayın
2. Email ve şifrenizi girin
3. Hesabınızı doğrulayın
4. Şifre yöneticisine giriş yapın
5. İlk öğenizi ekleyin

---

## 🌐 Production Dağıtımı

### Production Ortamında Yapılması Gerekenler

#### 1. Ortam Değişkenlerini Ayarlayın

Production sunucusunda `server/.env` dosyasını oluşturun veya aşağıdaki ortam değişkenlerini ayarlayın:

```bash
# Kritik Ayarlar (MUTLAKA ayarlanmalıdır)
NODE_ENV=production
PORT=3001
JWT_SECRET=<güvenli-bir-anahtar-oluşturun>
FRONTEND_URL=https://your-domain.com

# Opsiyonel Ayarlar
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
DB_PATH=/data/lockbox.db
LOG_LEVEL=info
```

#### 2. Güvenli JWT Secret Oluşturun

```bash
# Linux/macOS
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256}) -as [byte[]])
```

Oluşturulan değeri `JWT_SECRET` ortam değişkenine atayın.

#### 3. Veritabanı Yapılandırması

- Uygulamayı çalıştırdıktan sonra `server/data/lockbox.db` dosyası otomatik olarak oluşturulur
- Production için bu dosyayı düzenli olarak yedekleyin
- `DB_PATH` değişkenini değiştirerek veritabanı konumunu özelleştirebilirsiniz

#### 4. Frontend URL'sini Ayarlayın

`FRONTEND_URL` ortam değişkenine production domainini atayın:

```bash
# Örnek
FRONTEND_URL=https://lockbox.example.com
```

### Dağıtım Seçenekleri

#### Option 1: Node.js Doğrudan Sunucu

```bash
# Bağımlılıkları yükleyin
npm run setup

# Build yapın
npm run build

# Production sunucusunda çalıştırın
NODE_ENV=production JWT_SECRET=your-secret PORT=3001 node server/dist/index.js
```

#### Option 2: Docker ile Dağıtım

```bash
# Build edin
docker build -t lockbox .

# Çalıştırın
docker run -p 3001:3001 \
  -e NODE_ENV=production \
  -e JWT_SECRET=your-secret \
  -e FRONTEND_URL=https://your-domain.com \
  -v /data:/app/data \
  lockbox
```

#### Option 3: PM2 ile Kalıcı Çalışma

```bash
# PM2'yi yükleyin
npm install -g pm2

# Uygulamayı başlatın
pm2 start server/dist/index.js --name lockbox \
  --env NODE_ENV=production \
  --env JWT_SECRET=your-secret \
  --env PORT=3001

# Otomatik başlatmayı etkinleştirin
pm2 startup
pm2 save
```

---

## 📋 Production Checklist

Production ortamına geçmeden önce şunları kontrol edin:

- [ ] `NODE_ENV=production` ayarlandı
- [ ] `JWT_SECRET` güvenli bir değere ayarlandı
- [ ] `FRONTEND_URL` doğru domain adını gösteriyor
- [ ] Veritabanı dosyası yazılabilir konumda
- [ ] SSL/TLS sertifikası yapılandırıldı (HTTPS)
- [ ] Firewall kuralları ayarlandı (3001 portu erişime açık)
- [ ] Veritabanı yedekleme planı hazırlandı
- [ ] Rate limiting değerleri ihtiyaca göre ayarlandı
- [ ] Log dosyalarının rotasyonu yapılandırıldı

---

## 🔧 Sorun Giderme

### Bağlantı Hataları

```bash
# Portun açık olduğunu kontrol edin
netstat -an | grep 3001

# Güvenlik duvarını kontrol edin
sudo ufw allow 3001
```

### Veritabanı Hataları

```bash
# Veritabanı dosyasının izinlerini kontrol edin
ls -la server/data/lockbox.db

# İzinleri düzeltin
chmod 644 server/data/lockbox.db
```

### JWT Hataları

- `JWT_SECRET` ayarlandığını kontrol edin
- Secret değeri en az 32 karakter olmalı
- Secret değerini değiştirdikten sonra tüm aktif oturumlar kapatılacaktır

---

## 📄 Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasını kontrol edin.

---

**Lockbox ile verilerinizi güvenli tutun! 🔐**
