# RISE Web（Next.js）

## 本地开发

```bash
cp .env.example .env.local   # 配置 Factory、RPC
npm install
npm run dev
```

## 服务器部署（Nginx 8081 → Next 3000）

### 为什么曾经要 `rsync`？

Nginx 用户 `www-data` **读不了** `/home/ubuntu/...` 下的文件，且 Next 对含 `~` 的静态 chunk 易返回 500。  
所以曾把 `.next/static` **复制**到 `/var/www/rise-public/`。

### 可以取消 rsync 吗？

**可以。** 一次性做软链，以后 `npm run build` 会原地更新 `.next/static`，Nginx 通过链接直接读到新文件：

```bash
# 一次性（路径按你的服务器改）
sudo WEB_DIR=/home/ubuntu/rise/rise_fork/web bash deploy/link-static-for-nginx.sh
```

### 日常发版（不需要 rsync）

```bash
cd "$WEB_DIR"
git pull
npm run build
pkill -f "next start" || true
nohup npm run start > nohup.out 2>&1 &
```

静态资源会随 build 自动更新；只需在改 Nginx 配置或换项目目录时再跑一遍 `link-static-for-nginx.sh`。

详见 `docs/DEPLOYMENT.md`、`deploy/nginx-rise.conf.example`。
