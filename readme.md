# Automation Get Data - Fullstack & Automation Test

Sistem otomatis pengambilan data dari YouTube Shorts menggunakan arsitektur Microservices/Queue berbasis **Backend Express.js**, **Python Playwright Worker**, **Redis Queue**, **MySQL Database**, dan **Frontend React (Vite)**.

## Tech Stack
- **Backend API**: Express.js, JWT Auth, ioredis, MySQL2
- **Automation Service**: Python 3.10, Playwright (Headless Chromium), Redis Client
- **Queue**: Redis
- **Frontend**: React.js, Vite, Axios (Auto Refresh Token Interceptor)
- **Database**: MySQL 8.0
- **Containerization**: Docker & Docker Compose

---

## Cara Menjalankan Project

### Prasyarat
- Docker dan Docker Compose telah terinstall di perangkat.

### Langkah-langkah:
1. Clone repository ini:
   ```bash
   git clone https://github.com/Sens-00/Automation-Get-Data
   cd automation-get-data