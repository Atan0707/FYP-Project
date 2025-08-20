# 🕌 WEMSP - Web-based Estate Management with Shariah Principles

A comprehensive Islamic inheritance and estate management platform that automates Faraid (Islamic inheritance law) calculations, manages family assets, and provides blockchain-based agreement verification for Shariah-compliant estate distribution.

![Next.js](https://img.shields.io/badge/Next.js-15.2.1-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6.4.1-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Ethereum](https://img.shields.io/badge/Ethereum-Solidity-627EEA?style=for-the-badge&logo=ethereum&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Blockchain Integration](#blockchain-integration)
- [Contributing](#contributing)
- [License](#license)

## 🌟 Overview

WEMSP (Web-based Estate Management with Shariah Principles) is a modern web application designed to facilitate Islamic estate planning and inheritance distribution according to Faraid principles. The platform combines traditional Islamic jurisprudence with modern technology, including blockchain integration for secure and transparent agreement management.

### Key Objectives

- **Automate Faraid Calculations**: Accurate Islamic inheritance distribution based on Quranic principles
- **Family Asset Management**: Comprehensive tracking and categorization of family assets
- **Secure Agreements**: Blockchain-based NFT contracts for tamper-proof inheritance agreements
- **Administrative Oversight**: Admin approval system for legal compliance
- **Digital Documentation**: PDF generation and secure document management

## ✨ Features

### 🏠 Estate Management
- **Asset Registration**: Register various types of assets (Property, Vehicles, Investments, etc.)
- **Asset Valuation**: Track current market values and supporting documentation
- **Pending Asset Approval**: Admin-moderated asset verification system
- **Asset Distribution Planning**: Multiple distribution types (Faraid, Waqf, Hibah, Will)

### 👨‍👩‍👧‍👦 Family Management
- **Family Tree Builder**: Create and manage family relationships
- **Bidirectional Relationships**: Automatic inverse relationship mapping
- **Family Invitations**: Email-based invitation system for family members
- **Verification System**: Secure email and IC verification for family additions

### ⚖️ Faraid Calculator
- **Automated Distribution**: Malaysian Faraid calculation engine
- **Gender-Specific Rules**: Proper handling of inheritance based on gender
- **Complex Scenarios**: Support for multiple heirs, various family structures
- **Quranic Compliance**: Based on Surah An-Nisa verses 11-12 and authentic Hadith

### 🔐 Blockchain Integration
- **Smart Contracts**: Ethereum-based NFT contracts for agreements
- **Digital Signatures**: Secure family member signature collection
- **Transaction History**: Immutable record of all agreement actions
- **Admin Verification**: Multi-signature approval system

### 📄 Document Management
- **PDF Generation**: Automated agreement and distribution documents
- **Secure Storage**: Google Cloud Storage integration
- **Document Encryption**: End-to-end encryption for sensitive documents
- **Version Control**: Track document changes and updates

### 👨‍💼 Administrative Features
- **Admin Dashboard**: Comprehensive oversight and management tools
- **User Management**: Admin control over user accounts and permissions
- **Asset Approval Workflow**: Review and approve pending assets
- **Agreement Monitoring**: Track agreement status and signatures
- **Analytics & Reporting**: Usage statistics and compliance reports

## 🛠️ Technology Stack

### Frontend
- **Next.js 15.2.1** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/UI** - Modern component library
- **React Hook Form** - Form handling with validation
- **Framer Motion** - Smooth animations and transitions

### Backend
- **Next.js API Routes** - Server-side API endpoints
- **Prisma ORM** - Database abstraction and migration management
- **PostgreSQL** - Primary database
- **NextAuth.js** - Authentication and session management
- **Zod** - Schema validation

### Blockchain
- **Solidity ^0.8.26** - Smart contract development
- **Ethers.js** - Ethereum blockchain interaction
- **OpenZeppelin** - Secure smart contract libraries
- **ERC-721** - NFT standard for agreements

### Infrastructure
- **Google Cloud Storage** - File storage and management
- **Docker** - Containerization support
- **PM2** - Process management for production
- **Nodemailer** - Email service integration

## 📋 Prerequisites

Before running this application, ensure you have:

- **Node.js** (v18.0.0 or higher)
- **Yarn** package manager
- **PostgreSQL** (v12 or higher)
- **Git** for version control

### Optional Requirements
- **Docker** and **Docker Compose** (for containerized deployment)
- **Google Cloud Platform** account (for file storage)
- **Ethereum Wallet** (for blockchain features)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FYP-Project
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/wemsp_db"

# NextAuth Configuration
JWT_SECRET=""
NEXTAUTH_URL="http://localhost:3000"

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_CLOUD_CREDENTIALS=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# Email Configuration
# User Email
EMAIL_USER=
# User Email Application password
EMAIL_PASS=

# Blockchain Configuration (Optional)
NEXT_PUBLIC_PRIVATE_KEY=
NEXT_PUBLIC_RPC_URL=

# Application Configuration
APP_URL="http://localhost:3000"
```

### Google Cloud Storage Setup

1. Create a Google Cloud Platform project
2. Enable the Cloud Storage API
3. Create a service account with Storage Admin permissions
4. Download the service account JSON key
5. Update the environment variables accordingly

## 🗄️ Database Setup

1. **Create PostgreSQL database**
   ```bash
   createdb wemsp_db
   ```

2. **Run Prisma migrations**
   ```bash
   yarn prisma migrate dev
   ```

3. **Generate Prisma client**
   ```bash
   yarn prisma generate
   ```

4. **Seed database (optional)**
   ```bash
   yarn prisma db seed
   ```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
yarn dev
```
The application will be available at `http://localhost:3000`

### Production Mode
```bash
# Build the application
yarn build

# Start production server
yarn start
```

### Using PM2 (Production)
```bash
# Start with PM2
yarn start:pm2

# Monitor logs
yarn logs:pm2

# Restart application
yarn restart:pm2
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/verify-email` - Email verification
- `POST /api/reset-password` - Password reset

### User Management
- `GET /api/user` - Get user profile
- `PUT /api/user` - Update user profile
- `GET /api/user/search` - Search users

### Family Management
- `GET /api/family` - Get family members
- `POST /api/family` - Add family member
- `POST /api/family/invite` - Send family invitation
- `PUT /api/family/relationship` - Update relationships

### Asset Management
- `GET /api/asset` - Get user assets
- `POST /api/asset` - Create new asset
- `PUT /api/asset/[id]` - Update asset
- `DELETE /api/asset/[id]` - Delete asset

### Asset Distribution
- `POST /api/asset-distribution` - Create distribution plan
- `GET /api/asset-distribution` - Get distribution plans

### Admin Endpoints
- `GET /api/admin/users` - Manage users
- `GET /api/admin/pending-assets` - Review pending assets
- `POST /api/admin/pending-assets/[id]` - Approve/reject assets
- `GET /api/admin/agreements` - Manage agreements

## ⛓️ Blockchain Integration

### Smart Contract Features
- **ERC-721 NFT Contracts** for agreement representation
- **Multi-signature Support** for family members
- **Admin Verification** system
- **Immutable Record Keeping**


### Contract Interaction
The application automatically handles:
- Agreement creation as NFTs
- Family member signature collection
- Admin approval workflows
- Transaction hash storage

## 📁 Project Structure

```
FYP-Project/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/             # Admin dashboard
│   │   ├── api/               # API endpoints
│   │   ├── pages/             # User pages
│   │   └── login/             # Authentication
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # Base UI components
│   │   ├── home/             # Landing page components
│   │   └── sidebar/          # Navigation components
│   ├── lib/                   # Utility libraries
│   │   ├── faraid.ts         # Faraid calculation engine
│   │   ├── prisma.ts         # Database client
│   │   └── auth.ts           # Authentication utilities
│   ├── services/             # Business logic services
│   ├── contract/             # Smart contracts
│   └── types/                # TypeScript type definitions
├── prisma/                    # Database schema and migrations
├── public/                    # Static assets
└── docs/                     # Documentation files
```

## 🤝 Contributing

We welcome contributions to improve WEMSP! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit your changes**
   ```bash
   git commit -m "Add your feature description"
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests for new features
- Ensure Islamic jurisprudence accuracy for Faraid-related changes
- Update documentation for new features
- Follow the existing code style and conventions

## 📄 License

This project is proprietary and confidential. All rights reserved.


## 🙏 Acknowledgments

- **Malaysian Islamic Law** references and compliance
- **Open Source Community** for the amazing tools and libraries
- **Contributors** who helped build this platform

---

**Note**: This application handles sensitive financial and family information. Please ensure proper security measures are in place when deploying to production environments. Always consult with qualified Islamic scholars for complex inheritance scenarios.