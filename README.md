# CondensateDB v2 (BF768-KinaseCondensateDB-2026)

A Flask + MySQL web application for biomolecular condensate data exploration and management, including:
- public user portal (`/index`)
- public registration/login (`/register`, `/login`)
- role-gated admin panel (`/admin`)

This repository supports public access with role separation and JWT-based API security.

---

## 1. 项目概览

该数据库面向生物分子凝聚体（Condensate）研究，提供下列核心能力：

- 蛋白质 / 激酶检索与分页查询
- 脱落病变（疾病）与化学修饰（C-mod）关联查询
- 文献证据（PMID）追踪与展示
- 关系图谱（蛋白-凝聚体-疾病-C-mod）可视化
- 管理后台（仅管理员）支持主数据与关系维护、用户禁用/启用、日志查看

前端页面入口：
- 登录页：`/login`
- 注册页：`/register`
- 用户页：`/index`
- 管理页：`/admin`

---

## 2. 目录结构（快速识别）

- `app.py`：应用启动与初始化（Flask app 工厂 + 蓝图注册 + 默认管理员初始化）
- `config.py`：运行配置（含环境变量解析）
- `routes.py`：蓝图入口组装
- `controller/`：页面路由与 API 路由（auth + data）
- `service/utils.py`：JWT、分页、导出、通用响应工具
- `models/`：SQLAlchemy 模型（`user_info`、`protein`、`condensate` 等）
- `templates/`：页面模板（`login.html` / `register.html` / `index.html` / `admin.html`）
- `static/js/`：前端交互逻辑（公共 API 调用、列表交互、统计、关系图）
- `sql/condensatedb.sql`：数据库初始化 SQL（含基础表结构）
- `.env.example`：环境变量示例
- `requirements.txt`：Python 依赖
- `render.yaml`：Render 一键部署配置

---

## 3. 快速启动（本地）

### 3.1 环境依赖

- Python 3.9+（推荐 3.11）
- MariaDB / MySQL
- 可选：`redis`、CDN 访问（用于 `echarts`、`cytoscape` 资源加载）

### 3.2 安装与运行

```bash
cd /Users/FruityClaw/Desktop/BF768-KinaseCondensateDB-2026
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3.3 数据库准备

建议先导入数据库结构（生产/本地仅首次执行）：

```bash
mysql -u USER -pPASSWORD -h HOST Team3 < sql/condensatedb.sql
```

说明：
- 当前 SQL 文件在 `sql/condensatedb.sql`，创建了核心表结构与部分初始记录。
- SQL 文件中可含明文初始密码示例，部署前请立即更新管理员凭据。

### 3.4 配置环境变量

```bash
cp .env.example .env
```

至少配置：

- `DATABASE_URL`
- `SECRET_KEY`
- `JWT_SECRET`
- `ADMIN_BOOTSTRAP_PASSWORD`（建议强随机）
- `ALLOW_PUBLIC_REGISTRATION`（默认 true，允许公开注册）

### 3.5 启动

开发启动：

```bash
python app.py
```

生产启动（可选）：

```bash
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

访问：
- 登录：`http://127.0.0.1:5001/login`
- 注册：`http://127.0.0.1:5001/register`
- 首页：`http://127.0.0.1:5001/index`
- 管理：`http://127.0.0.1:5001/admin`

---

## 4. 配置项说明（核心）

| 环境变量 | 说明 | 建议值 |
|---|---|---|
| `FLASK_ENV` | Flask 运行环境 | `production` |
| `SECRET_KEY` | Flask 安全密钥 | 强随机字符串 |
| `JWT_SECRET` | JWT 签名密钥 | 强随机字符串 |
| `JWT_EXPIRE_HOURS` | Token 有效时长（小时） | `8` |
| `DATABASE_URL` | 数据库连接 | `mysql+pymysql://USER:PASSWORD@HOST:3306/Team3?charset=utf8mb4` |
| `SERVER_HOST` | 监听 Host | `0.0.0.0` |
| `SERVER_PORT` | 监听端口 | `5001` |
| `DEBUG` | 调试开关 | 生产建议 `false` |
| `ALLOW_PUBLIC_REGISTRATION` | 是否允许公开注册 | `true` / `false` |
| `CORS_ORIGINS` | CORS 白名单 | `*` 或具体域名 |
| `ADMIN_BOOTSTRAP_ENABLED` | 启动时自动创建管理员 | `true` |
| `ADMIN_BOOTSTRAP_USERNAME` | 管理员用户名 | `admin` |
| `ADMIN_BOOTSTRAP_PASSWORD` | 管理员初始密码 | 强密码 |
| `ADMIN_BOOTSTRAP_EMAIL` | 管理员邮箱 | 有效邮箱 |

---

## 5. 访问与权限模型

- 未登录请求 `/api/*`：
  - 返回 `code=401`（登录失效/未登录），前端会触发跳转到 `/login`
- 普通用户：
  - 登录后访问 `/index`，可进行全部查询与导出
  - 可在 `/register` 自行注册（默认开启）
- 管理员：
  - 需管理员账号，访问 `/admin`
  - 可增删改查主数据和关系、切换用户状态

---

## 6. 主要 API 文档（v2）

说明：所有 API 均采用 JSON，响应格式统一如下：

```json
{
  "code": 200,
  "msg": "success",
  "data": ...
}
```

### 6.1 鉴权接口（`/api/auth`）

- `POST /api/auth/login`
  - Body：`{ "username": "", "password": "", "role": "user|admin" }`
  - 成功返回：`token`, `user`
- `POST /api/auth/register`
  - Body：`{ "username": "", "password": "", "email": "", "gender": "", "phone": "" }`
  - 默认仅创建 `user`，并要求密码长度 >= 8

### 6.2 通用查询与管理（`/api`）

支持分页参数：`page`、`size`（服务端强制最大 `size=100`）。

资源名及字段：
- `users`（普通用户视图）
- `proteins`
- `kinases`
- `condensates`
- `diseases`
- `cmods`
- `publications`
- `admin-logs`（仅管理员）

公共接口：
- `GET /api/<name>?page=&size=&keyword=`
- `GET /api/options/<name>` 下拉选项
- `GET /api/<name>/export?keyword=&type=excel|csv` 下载导出文件

管理员接口：
- `POST /api/<name>` 创建（含自动写 `admin_log`）
- `PUT /api/<name>/<id>` 更新
- `DELETE /api/<name>/<id>` 删除
- `PUT /api/users/<id>/toggle` 启用/禁用用户

### 6.3 高级检索与关系查询

- `GET /api/search/advanced?protein_name=&condensate_id=&disease_id=&cmod_id=&pmid=`
- `GET /api/proteins/<pid>/condensates`
- `GET /api/condensates/<cid>/proteins`
- `GET /api/condensates/<cid>/diseases`
- `GET /api/condensates/<cid>/cmods`
- `GET /api/diseases/<did>/condensates`
- `GET /api/cmods/<mid>/condensates`
- `GET /api/publications/<pmid>/evidence`

### 6.4 统计与图谱

- `GET /api/stats/summary`
- `GET /api/stats/charts`
- `GET /api/network?keyword=&mode=&limit=`
  - `mode`: `all | protein_condensate | condensate_disease | condensate_cmod`

### 6.5 关系编辑（管理员）

- `POST /api/relations/protein-condensate`
- `DELETE /api/relations/protein-condensate/<rid>`
- `POST /api/relations/condensate-cmod`
- `DELETE /api/relations/condensate-cmod/<rid>`
- `POST /api/relations/condensate-disease`
- `DELETE /api/relations/condensate-disease/<rid>`

---

## 7. 页面与前端行为说明

- 登录/注册页使用 `localStorage` 持久化 token。
- 所有受保护页面在前端未检测到 token 时会跳转 `/login`。
- 列表支持：
  - 关键词检索、分页
  - 无数据与错误状态展示
  - 行内展开/复制
- `/admin` 支持：
  - 用户管理（含禁用/启用）
  - 数据增删改查
  - 关系维护（增删）
  - 统计图（依赖 `echarts`）
- 网络图使用 `cytoscape`，后端返回受限条数并提供 `mode/keyword/limit` 参数控制。

---

## 8. 部署（Render）

仓库已包含 `render.yaml`，支持快速托管上线。

推荐步骤：
1. 连接 Git 仓库，分支选择 `main`
2. 配置环境变量（见 4）
3. 监听端口按配置发布
4. 部署后访问:
   - `/login`
   - `/register`
   - `/index`
   - `/admin`（管理员）

---

## 9. 常见故障排查

- 无法登录/频繁 401：
  - 检查 `JWT_SECRET` 是否一致、token 是否过期（`JWT_EXPIRE_HOURS`）
- 登录页可进但部分接口 403：
  - 使用了管理员权限接口，确认 role 为 `admin`
- `/api/network` 空白/无图：
  - 检查 `cytoscape` CDN 是否可达
  - 使用非空关键词（如 `BRD4`, `TP53`, `EGFR`）
- 注册成功但无法登录：
  - 检查数据库中 `user_info` 约束（`username` 唯一 / `email` 唯一）

---

## 10. 安全建议

- 部署时必须设置强随机 `SECRET_KEY` 与 `JWT_SECRET`
- 勿提交明文生产密码
- 建议通过反向代理和 HTTPS 提供服务
- 管理员账号请通过环境变量初始化并定期轮换
- 默认示例 SQL 的测试口令应在数据库初始化后立即改密

---

## 11. 现有文档关系

- 主入口说明请看本文件 `README.md`
- 公开部署补充与 Render 演示建议见 `README_Team3_Access_Guide.md`
- 本次新增不删除任何现有页面文件或使用说明内容

---

## 12. 执行清单（实现级）

1. 新增 `README.md`，将以上内容按当前仓库实际端口/域名替换示例值。
2. 保留 `README_Team3_Access_Guide.md`，不做删除或内容替代。
3. 在 README 首行添加仓库名与一句话定位，确保新读者 2 分钟内可启动。
4. 可选：补充一条服务端口示例为 `5001` 与数据库名/实例自定义说明，避免误导。
5. 提交：`git add README.md && git commit -m "add detailed project README for setup and API usage"`（不改变其他文件）
