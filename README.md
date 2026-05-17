# CondensateDB v2 (BF768-KinaseCondensateDB-2026)

A Flask + MySQL web application for biomolecular condensate data exploration and management, including:

- Public user portal (`/index`)
- Public registration/login (`/register`, `/login`)
- Role-gated admin panel (`/admin`)

This repository supports public access with role separation and JWT-based API security.

---

## 1. Project Overview

The database is designed for biomolecular condensate research and provides:

- Protein / kinase search with paginated lists
- Disease and chemical modifier (C-mod) association queries
- Literature evidence (PMID) tracing and display
- Relation graph visualization for protein-condensate-disease-C-mod links
- Admin dashboard for master-data maintenance, relation maintenance, user activation/deactivation, and operation logs

Frontend page entry points:
- Login page: `/login`
- Registration page: `/register`
- User dashboard: `/index`
- Admin dashboard: `/admin`

---

## 2. Quick Project Layout

- `app.py`: application startup and initialization (Flask app factory + blueprint registration + bootstrap admin account)
- `config.py`: runtime configuration loaded from environment variables
- `routes.py`: blueprint registration
- `controller/`: page routes and API routes (`auth`, `data`)
- `service/utils.py`: JWT, pagination, export, common response helpers
- `models/`: SQLAlchemy models (`user_info`, `protein`, `condensate`, etc.)
- `templates/`: page templates (`login.html` / `register.html` / `index.html` / `admin.html`)
- `static/js/`: frontend interaction logic (API wrapper, list views, stats, graph)
- `sql/condensatedb.sql`: database initialization SQL (core schema)
- `.env.example`: environment variable sample file
- `requirements.txt`: Python dependencies
- `render.yaml`: Render deployment descriptor

---

## 3. Local Quick Start

### 3.1 Runtime Requirements

- Python 3.9+ (recommended 3.11)
- MariaDB / MySQL
- Optional: `redis`, network access for CDN resources (`echarts`, `cytoscape`)

### 3.2 Install Dependencies

```bash
cd /Users/FruityClaw/Desktop/BF768-KinaseCondensateDB-2026
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3.3 Database Preparation

Import the schema before first run (production/local initialization only):

```bash
mysql -u USER -pPASSWORD -h HOST Team3 < sql/condensatedb.sql
```

Notes:
- `sql/condensatedb.sql` creates the core tables and seed records.
- This file may include sample plaintext credentials; update administrator credentials immediately after deployment.

### 3.4 Configure Environment Variables

```bash
cp .env.example .env
```

At minimum, set:

- `DATABASE_URL`
- `SECRET_KEY`
- `JWT_SECRET`
- `ADMIN_BOOTSTRAP_PASSWORD` (strong random value)
- `ALLOW_PUBLIC_REGISTRATION` (default true, enables public signup)

### 3.5 Start the Service

Development mode:

```bash
python app.py
```

Production option:

```bash
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

URLs (example if running on local port 5001):
- Login: `http://127.0.0.1:5001/login`
- Register: `http://127.0.0.1:5001/register`
- Home: `http://127.0.0.1:5001/index`
- Admin: `http://127.0.0.1:5001/admin`

---

## 4. Key Configuration Reference

| Environment Variable | Description | Suggested Value |
|---|---|---|
| `FLASK_ENV` | Flask runtime environment | `production` |
| `SECRET_KEY` | Flask secret key | Strong random string |
| `JWT_SECRET` | JWT signing secret | Strong random string |
| `JWT_EXPIRE_HOURS` | Token TTL in hours | `8` |
| `DATABASE_URL` | MySQL connection string | `mysql+pymysql://USER:PASSWORD@HOST:3306/Team3?charset=utf8mb4` |
| `SERVER_HOST` | Bind host | `0.0.0.0` |
| `SERVER_PORT` | Bind port | `5001` |
| `DEBUG` | Debug switch | `false` in production |
| `ALLOW_PUBLIC_REGISTRATION` | Allow public user signup | `true` / `false` |
| `CORS_ORIGINS` | CORS allow list | `*` or explicit origins |
| `ADMIN_BOOTSTRAP_ENABLED` | Create bootstrap admin on startup | `true` |
| `ADMIN_BOOTSTRAP_USERNAME` | Admin username | `admin` |
| `ADMIN_BOOTSTRAP_PASSWORD` | Initial admin password | Strong random password |
| `ADMIN_BOOTSTRAP_EMAIL` | Admin email | A valid email |

---

## 5. Access and Permission Model

- Unauthenticated calls to `/api/*`:
  - return `code=401` (missing/expired login), and frontend redirects to `/login`.
- Regular users:
  - can access `/index` after login
  - can perform search/list/export operations
  - can self-register via `/register` when `ALLOW_PUBLIC_REGISTRATION=true`
- Administrators:
  - require admin role account
  - can access `/admin`
  - can create/update/delete master data and relationship entries
  - can enable/disable user accounts

---

## 6. API Reference (v2)

All APIs return JSON in this shape:

```json
{
  "code": 200,
  "msg": "success",
  "data": ...
}
```

### 6.1 Auth APIs (`/api/auth`)

- `POST /api/auth/login`
  - Body: `{ "username": "", "password": "", "role": "user|admin" }`
  - Success returns `token` and `user`
- `POST /api/auth/register`
  - Body: `{ "username": "", "password": "", "email": "", "gender": "", "phone": "" }`
  - Creates standard user only; password must be at least 8 characters

### 6.2 Generic Query and Management APIs (`/api`)

Pagination supports `page` and `size` (server-enforced maximum `size=100`).

Supported resource names:
- `users` (normal user view)
- `proteins`
- `kinases`
- `condensates`
- `diseases`
- `cmods`
- `publications`
- `admin-logs` (admin only)

Common endpoints:
- `GET /api/<name>?page=&size=&keyword=`
- `GET /api/options/<name>` for dropdown option lists
- `GET /api/<name>/export?keyword=&type=excel|csv` for export

Admin-only endpoints:
- `POST /api/<name>` (create, and writes `admin_log`)
- `PUT /api/<name>/<id>` (update)
- `DELETE /api/<name>/<id>` (delete)
- `PUT /api/users/<id>/toggle` (enable/disable user)

### 6.3 Advanced Search and Relation Queries

- `GET /api/search/advanced?protein_name=&condensate_id=&disease_id=&cmod_id=&pmid=`
- `GET /api/proteins/<pid>/condensates`
- `GET /api/condensates/<cid>/proteins`
- `GET /api/condensates/<cid>/diseases`
- `GET /api/condensates/<cid>/cmods`
- `GET /api/diseases/<did>/condensates`
- `GET /api/cmods/<mid>/condensates`
- `GET /api/publications/<pmid>/evidence`

### 6.4 Statistics and Graph APIs

- `GET /api/stats/summary`
- `GET /api/stats/charts`
- `GET /api/network?keyword=&mode=&limit=`
  - `mode`: `all | protein_condensate | condensate_disease | condensate_cmod`

### 6.5 Relation Editing (Admin)

- `POST /api/relations/protein-condensate`
- `DELETE /api/relations/protein-condensate/<rid>`
- `POST /api/relations/condensate-cmod`
- `DELETE /api/relations/condensate-cmod/<rid>`
- `POST /api/relations/condensate-disease`
- `DELETE /api/relations/condensate-disease/<rid>`

---

## 7. Frontend Behavior

- Login token is persisted in `localStorage`.
- Protected pages redirect to `/login` when token is missing in local frontend check.
- List views support:
  - keyword filtering
  - pagination
  - empty state and error state messages
  - row expand and row copy actions
- `/admin` supports:
  - user management (including disable/enable)
  - CRUD for master data
  - relation maintenance (add/remove)
  - dashboard charts (dependency: `echarts`)
- Network graph uses `cytoscape` with backend result caps and `mode/keyword/limit` controls.

---

## 8. Render Deployment

This repository includes `render.yaml` for quick deployment.

Recommended flow:
1. Connect repository and use branch `main`
2. Add environment variables from Section 4
3. Deploy with configured host/port
4. Access after deployment:
   - `/login`
   - `/register`
   - `/index`
   - `/admin` (admin only)

---

## 9. Common Troubleshooting

- Frequent 401 or cannot login:
  - Verify `JWT_SECRET` consistency and token expiration (`JWT_EXPIRE_HOURS`)
- Login page works but some endpoints return 403:
  - Ensure admin role is used for admin APIs
- Network graph page is empty:
  - Ensure `cytoscape` CDN is reachable
  - Try non-empty keywords such as `BRD4`, `TP53`, `EGFR`
- Registration success but login failure:
  - Check unique constraints in `user_info` (`username`, `email`)

---

## 10. Security Best Practices

- Set strong random values for `SECRET_KEY` and `JWT_SECRET` in production
- Do not store or commit production plaintext passwords
- Recommend reverse proxy + HTTPS for public traffic
- Initialize admin account via environment variables and rotate periodically
- Change any sample credentials from SQL seed data immediately after deployment

---

## 11. Documentation Relationship

- This file is the main project guide.
- Additional public-access and Render walkthrough details are documented in `README_Team3_Access_Guide.md`.
- This change only adds documentation and does not remove any existing page/help content.

---

## 12. Implementation Checklist

1. Add this English `README.md` and align sample values (host/port/database) to your real deployment context.
2. Keep `README_Team3_Access_Guide.md` unchanged.
3. Keep top-level summary + quick-start path so new users can run the system quickly.
4. Optionally add a brief deployment example if your environment differs from the default values.
5. Commit only `README.md` without changing other tracked files.
