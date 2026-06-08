# SaaS Lead Management CRM (Backend)

A Multi-Tenant SaaS Lead Management CRM Backend built using Node.js, Express.js, MongoDB, JWT Authentication, and Role-Based Access Control.

---

# GitHub Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
```

---

# Local Setup

## 1. Clone Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>

cd SaaS-Lead-Management-CRM-Backend
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Create `.env` File

Create a `.env` file in the project root and add:

```env
PORT=9000

MONGO_URI="mongodb+srv://arunv2074_db_user:LDO1xPJRM48fjA7H@cluster0.iynwy3v.mongodb.net/saas-crm?retryWrites=true&w=majority&appName=saas-crm"

access_token_secret=your_access_token_secret

refresh_token_secret=your_refresh_token_secret

NODE_ENV=development

FRONTEND_URL=http://localhost:5173
```

## 4. Run Project

```bash
npm run dev
```

Server will start on:

```bash
http://localhost:9000
```

---

# Default Super Admin Credentials

```text
Email: superadmin@gmail.com

Password: 123456
```

---

# Multi-Tenancy Architecture

This project follows a multi-tenant architecture where each Admin manages their own Staff and Leads.

Users are assigned roles:

* Super Admin
* Admin
* Staff

Role-based authorization is implemented using JWT authentication middleware. Tenant data is isolated through ownership relationships, ensuring users can only access resources that belong to their organization.

---

# Caching Implementation

A custom In-Memory Cache has been implemented to reduce unnecessary database queries.

Cached Resource:

* Tenant Plan Information

Workflow:

1. Check cache first.
2. Return cached data if available.
3. Query MongoDB on cache miss.
4. Store result in cache with TTL.
5. Return response.

This improves API performance and reduces database load.

---

# API Endpoints

## Authentication

### Login

```http
POST /api/v1/auth/login
```

Payload:

```json
{
  "email": "superadmin@gmail.com",
  "password": "123456"
}
```

---

## Plans

### Create Plan

```http
POST /api/v1/plans
```

```json
{
  "name": "Premium",
  "leadLimit": 0,
  "userLimit": 0
}
```

### Get Plans

```http
GET /api/v1/plans
```

### Update Plan

```http
PUT /api/v1/plans/:id
```

### Delete Plan

```http
DELETE /api/v1/plans/:id
```

---

## Tenant Admin

### Create Tenant

```http
POST /api/v1/tenant
```

```json
{
  "name": "Admin User",
  "email": "admin@test.com",
  "password": "123456",
  "phone": "9876543210",
  "plan": "PLAN_ID",
  "role": "admin"
}
```

### Get Tenants

```http
GET /api/v1/tenant
```

### Update Tenant

```http
PUT /api/v1/tenant/:id
```

### Delete Tenant

```http
DELETE /api/v1/tenant/:id
```

---

## Staff

### Create Staff

```http
POST /api/v1/staff
```

```json
{
  "name": "Staff User",
  "email": "staff@test.com",
  "password": "123456",
  "phone": "9876543210",
  "role": "staff"
}
```

### Get Staff

```http
GET /api/v1/staff
```

### Update Staff

```http
PUT /api/v1/staff/:id
```

### Delete Staff

```http
DELETE /api/v1/staff/:id
```

---

## Leads

### Create Lead

```http
POST /api/v1/leads
```

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210"
}
```

### Get Leads

```http
GET /api/v1/leads
```

### Update Lead

```http
PUT /api/v1/leads/:id
```

### Delete Lead

```http
DELETE /api/v1/leads/:id
```
