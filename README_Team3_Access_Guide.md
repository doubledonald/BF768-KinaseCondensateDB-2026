# Team3 CondensateDB Access Guide / Team3 CondensateDB 项目访问指南

## English Version

### 1. Project status

The Team3 CondensateDB project has already been deployed on the bioed server.  
The web application is running on the server's internal address:

```text
127.0.0.1:5001
```

Because this address is only accessible inside the server, each teammate needs to use **MobaXterm SSH Tunnel** to open the project in their own browser.

---

### 2. Open MobaXterm tunnel settings

Open **MobaXterm**, then go to:

```text
Tunneling → New SSH tunnel
```

Choose:

```text
Local port forwarding
```

---

### 3. Tunnel configuration

Use the following settings:

```text
Forwarded port: 5001
Remote server: 127.0.0.1
Remote port: 5001

SSH server: bioed-new.bu.edu
SSH login: your bioed username
SSH port: 22
```

For example, if your bioed username is `abc123`, then use:

```text
SSH login: abc123
```

After filling in the fields, click **Save**, then start the tunnel.

---

### 4. Open the project in browser

After the tunnel is running, open this URL in your local browser:

```text
http://127.0.0.1:5001/login
```

This local address will be forwarded by MobaXterm to the project running on the bioed server.

---

### 5. Login accounts

User account:

```text
Username: xiaoming
Password: 123456
```

Another user account:

```text
Username: xiaozhang
Password: 123456
```

Admin account:

```text
Username: admin
Password: 123456
```

---

### 6. If local port 5001 is already in use

If your computer already uses local port `5001`, change only the **Forwarded port** to `5002`:

```text
Forwarded port: 5002
Remote server: 127.0.0.1
Remote port: 5001

SSH server: bioed-new.bu.edu
SSH login: your bioed username
SSH port: 22
```

Then open this URL in your browser:

```text
http://127.0.0.1:5002/login
```

This means:

```text
Your computer 127.0.0.1:5002
        → MobaXterm SSH tunnel
Bioed server 127.0.0.1:5001
```

You are still viewing the same Team3 project.

---

### 7. Notes

If you only want to view or test the project, do **not** restart the server application.  
Only start the MobaXterm tunnel and open the browser URL.

If the page cannot be opened, check:

```text
1. The MobaXterm tunnel is running.
2. SSH server is bioed-new.bu.edu.
3. Remote server is 127.0.0.1.
4. Remote port is 5001.
5. Browser URL is http://127.0.0.1:5001/login.
```

If you use local port `5002`, open:

```text
http://127.0.0.1:5002/login
```

---

## 中文版本

### 1. 项目状态

Team3 CondensateDB 项目已经部署在 bioed 服务器上。  
项目目前运行在服务器内部地址：

```text
127.0.0.1:5001
```

因为这个地址只能在服务器内部访问，所以每位组员需要使用 **MobaXterm SSH Tunnel**，把服务器端口转发到自己电脑浏览器里访问。

---

### 2. 打开 MobaXterm Tunnel 设置

打开 **MobaXterm**，进入：

```text
Tunneling → New SSH tunnel
```

选择：

```text
Local port forwarding
```

---

### 3. Tunnel 配置方式

按照下面填写：

```text
Forwarded port: 5001
Remote server: 127.0.0.1
Remote port: 5001

SSH server: bioed-new.bu.edu
SSH login: 你的 bioed 用户名
SSH port: 22
```

例如，如果你的 bioed 用户名是 `abc123`，那么填写：

```text
SSH login: abc123
```

填写完成后，点击 **Save**，然后启动这个 tunnel。

---

### 4. 在浏览器打开项目

Tunnel 启动成功后，在自己电脑浏览器里打开：

```text
http://127.0.0.1:5001/login
```

这里的 `127.0.0.1:5001` 是你自己电脑的本地地址，但会通过 MobaXterm tunnel 转发到 bioed 服务器上的项目。

---

### 5. 登录账号

普通用户账号：

```text
Username: xiaoming
Password: 123456
```

另一个普通用户账号：

```text
Username: xiaozhang
Password: 123456
```

管理员账号：

```text
Username: admin
Password: 123456
```

---

### 6. 如果本地 5001 端口被占用

如果你的电脑本地 `5001` 端口已经被占用，只需要把 **Forwarded port** 改成 `5002`：

```text
Forwarded port: 5002
Remote server: 127.0.0.1
Remote port: 5001

SSH server: bioed-new.bu.edu
SSH login: 你的 bioed 用户名
SSH port: 22
```

然后浏览器打开：

```text
http://127.0.0.1:5002/login
```

这个配置的意思是：

```text
你的电脑 127.0.0.1:5002
        → MobaXterm SSH tunnel
bioed 服务器 127.0.0.1:5001
```

访问的仍然是同一个 Team3 项目。

---

### 7. 注意事项

如果只是查看或测试项目，请不要在服务器上重新启动项目。  
只需要启动 MobaXterm tunnel，然后用浏览器访问即可。

如果网页打不开，请检查：

```text
1. MobaXterm tunnel 是否已经启动。
2. SSH server 是否是 bioed-new.bu.edu。
3. Remote server 是否是 127.0.0.1。
4. Remote port 是否是 5001。
5. 浏览器地址是否是 http://127.0.0.1:5001/login。
```

如果你使用本地端口 `5002`，浏览器应打开：

```text
http://127.0.0.1:5002/login
```
