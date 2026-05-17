# Team3 CondensateDB Public Access Guide

## CondensateDB v2.0 (Public Access Edition)

This repository now supports **public read/write registration** and role-gated usage of
the CondensateDB platform.

## 1. Quick start (Public access mode)

### 1.1 Install dependencies

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 1.2 Configure environment

Copy `.env.example` (new), edit with your database and secrets:

```bash
cp .env.example .env
# Fill real values in .env, then install and start
```

Or create your own `.env`/container secrets in your deployment platform.
The app loads `.env` automatically when present.

Key settings (public access mode defaults to open registration):
- `DATABASE_URL`: MySQL connection string for MariaDB/MySQL.
- `SECRET_KEY`: Flask session/JWT signing base secret.
- `JWT_SECRET`: JWT signing secret (set strong random value).
- `ALLOW_PUBLIC_REGISTRATION`: set to `true` for open user self-registration.
- `DEBUG`: keep `false` in public/public-facing deployment.
- `SERVER_HOST` and `SERVER_PORT`: public host and port.
- `CORS_ORIGINS`: allow frontend/domain origin list.

Default behavior is `ALLOW_PUBLIC_REGISTRATION=true`. Leave this on for a truly public instance.

### 1.3 Start app

```bash
python app.py
```

Then visit:

- User login: `http://<your-host>:<port>/login`
- Public registration: `http://<your-host>:<port>/register`
- User dashboard: `http://<your-host>:<port>/index`

## 2. What changed for public deployment

1. **Public registration is enabled** with role-gated account creation.
2. **Authentication hardened**:
   - Passwords are now stored with Werkzeug password hashes.
   - Legacy plaintext credentials are only accepted for backward compatibility and
     rehashed on first successful login.
3. **Public/private separation**:
   - Visitors can register as standard users from `/register`.
   - Admin functions stay under `/admin` and require admin JWT.
4. **Configurable runtime**:
   - Host, port, CORS, token lifetime, and secrets come from environment vars.
   - Optional admin bootstrap can initialize one admin account at startup.

## 2.1 Public entry points

- Registration: `/register`
- Login: `/login`
- Public dashboard: `/index`
- Admin panel: `/admin` (admin account required)

## 3. Admin account strategy

Admin users are not meant for public registration. For deployment:

- Set `ADMIN_BOOTSTRAP_ENABLED=true`.
- Set a strong `ADMIN_BOOTSTRAP_PASSWORD`.
- Set `ADMIN_BOOTSTRAP_USERNAME` and optional `ADMIN_BOOTSTRAP_EMAIL`.

On startup, the system creates that admin account if missing. If disabled,
please pre-create admins in your database migration/import flow.

## 4. Notes

- Please do not keep default secrets in production.
- Keep `admin` credentials in secure secrets manager, not in this document.
- For HTTPS/production hosting, serve behind a reverse proxy and set `SERVER_HOST=0.0.0.0`.
- After deployment, you can directly share `https://<your-domain>/register` so anyone can create a standard user account.

## 5. Quick Deploy (Render)

This repo includes `render.yaml`, so you can deploy in one pass from Render:

1. Create a new **Web Service** in Render and connect this repository.
2. Keep branch as `main`; Render will detect `render.yaml`.
3. Add mandatory environment variables in Render dashboard:
   - `DATABASE_URL` (required)
   - `SECRET_KEY` (strong random string)
   - `JWT_SECRET` (strong random string)
   - `ADMIN_BOOTSTRAP_PASSWORD` (strong admin password)
   - Optional: `ADMIN_BOOTSTRAP_USERNAME`, `ADMIN_BOOTSTRAP_EMAIL`, `CORS_ORIGINS`
4. After deployment, open:
   - Login: `https://<render-service-url>/login`
   - Register: `https://<render-service-url>/register`
   - Home: `https://<render-service-url>/index`
   - Admin: `https://<render-service-url>/admin` (admin token required)

Render will expose a public HTTPS URL once the service is live.

## 中文说明（简版）

当前版本已支持公开访问与公开注册，页面入口不再依赖 SSH tunnel。  
普通用户通过 `/register` 创建账号，管理员账号通过环境变量初始化并仅用于后台管理。  
启动后访问 `/login` 即可进入系统。
