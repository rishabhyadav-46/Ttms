# TTMS - Truck Turnaround Management System

[![Node.js](https://img.shields.io/badge/Node.js-v20-green?logo=node.js)](https://nodejs.org)
[![Prisma](https://img.shields.io/badge/Prisma-v5.22-blue?logo=prisma)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v16-blue?logo=postgresql)](https://postgresql.org)
[![Express](https://img.shields.io/badge/Express-v5.2-orange?logo=express)](https://expressjs.com)

A modern, full-stack web application for managing truck gate entries, authentication, and real-time analytics in logistics operations. Built with sustainability and efficiency in mind.

## ✨ Features

- **User Authentication**: Secure signup/login with JWT tokens and bcrypt password hashing
- **Gate Entry Management**: Create, read, update gate entries with vehicle details, weights, and timestamps
- **Real-time Analytics**: Dashboard with turnaround time, status breakdowns, and vehicle/inward type reports
- **Responsive UI**: Modern Tailwind CSS frontend with beautiful, eco-themed design
- **Database**: PostgreSQL with Prisma ORM (Supabase compatible)
- **Logging**: Comprehensive request and error logging to `./logs/app.log`
- **API Documentation**: Built-in server startup logs all endpoints

## 📱 Screenshots

| Landing Page | Entry Details | Reports Dashboard |
|--------------|---------------|-------------------|
| ![Landing](https://via.placeholder.com/800x400/2d4c3e/ffffff?text=Landing+Page) | ![Entry](https://via.placeholder.com/800x400/76c893/ffffff?text=Entry+Details) | ![Reports](https://via.placeholder.com/800x400/4a6d5c/ffffff?text=Reports) |

## 🏗️ Tech Stack

| Frontend | Backend | Database | Tools |
|----------|---------|----------|-------|
| HTML5, TailwindCSS | Node.js, Express 5 | PostgreSQL | Prisma ORM, JWT, bcryptjs |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase recommended)
- `.env` file with `DATABASE_URL` and `JWT_SECRET`

### 1. Clone & Install
```bash
git clone https://github.com/rishabhyadav-46/Ttms.git
cd Ttms
npm install
```

### 2. Environment Setup
Create `.env`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/ttms"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
PORT=3001
```

### 3. Database Setup
```bash
npm run db:setup
```
This runs:
- `npx prisma generate`
- `node scripts/prisma-setup.js`

### 4. Run Server
```bash
npm start
```
Server runs on `http://localhost:3001`

## 📂 Project Structure

```
Ttms/
├── index.js                 # Express server & API routes
├── package.json            # Dependencies & scripts
├── prisma/
│   └── schema.prisma       # Database models
├── public/                 # Static frontend files
│   ├── index.html         # Landing page
│   ├── loginpage.html     # Login form
│   ├── signup.html        # Signup form
│   ├── entrydetails.html  # Gate entry form
│   └── report.html        # Analytics dashboard
└── scripts/
    └── prisma-setup.js    # Database initialization
```

## 🔗 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/signup` | - | Create new user account |
| `POST` | `/api/auth/login` | - | User login |
| `POST` | `/api/gate-entries` | ✅ | Create gate entry |
| `GET` | `/api/gate-entries` | ✅ | Get all entries |
| `GET` | `/api/gate-entries/:id` | ✅ | Get single entry |
| `PUT` | `/api/gate-entries/:id` | ✅ | Update entry |
| `GET` | `/api/reports/dashboard` | ✅ | Analytics summary |
| `GET` | `/api/reports/detailed` | ✅ | Filtered reports |

**Auth**: Send `Authorization: Bearer <token>` header

## 🗄️ Database Schema

```prisma
model User {
  id          String    @id @default(cuid())
  fullName    String
  companyName String
  email       String    @unique
  password    String    # bcrypt hashed
  role        String    @default("operator")
  gateEntries GateEntry[]
}

model GateEntry {
  id              String   @id @default(cuid())
  gateEntryNo     String
  vehicleNumber   String
  vehicleType     String
  transporter     String
  inwardType      String
  location        String
  reportingTimeDate DateTime
  inDateTime      DateTime?
  tareWeight      Float
  status          String   @default("pending")
  userId          String
  user            User     @relation(fields: [userId], references: [id])
}
```

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | - | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | `your-secret-key-change-in-production` | JWT signing key |
| `PORT` | - | `3001` | Server port |

## 🧪 Testing

```bash
npm test  # No tests yet
```

## 🔒 Security Features

- JWT authentication (7-day tokens)
- Password hashing (bcryptjs)
- Input validation
- Rate limiting ready
- CORS configured
- Helmet middleware ready

## 🌿 Development

```bash
# Install dev dependencies
npm install prisma --save-dev

# Generate Prisma client
npx prisma generate

# Studio (DB browser)
npx prisma studio

# Format code
npm install prettier --save-dev  # then add script
```

## 🤝 Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

ISC License - see [LICENSE](LICENSE) (or create one)

## 👥 Authors

- **Rishabh Yadav** - [GitHub](https://github.com/rishabhyadav-46)

## 🙏 Acknowledgments

- [Prisma](https://prisma.io) - Amazing ORM
- [TailwindCSS](https://tailwindcss.com) - Beautiful UI
- [Express](https://expressjs.com) - Fast backend

---

⭐ **Star this repo if it helps your logistics operations!**

---

*Built with ❤️ for sustainable logistics* 🌱

