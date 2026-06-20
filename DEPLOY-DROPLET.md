# פריסת SPORTZ על DigitalOcean Droplet 🌊

מדריך מלא להרצת האתר על דרופלט עם Docker, מתזמן פנימי (כל 5 דקות),
Nginx כ-reverse proxy ו-SSL חינמי (Let's Encrypt).

> יתרון הדרופלט: ה-filesystem **מתמשך**, ולכן אחסון הקבצים המובנה (`.data`)
> עובד מצוין — **אין צורך ב-Upstash/בסיס נתונים חיצוני**.

---

## 1. יצירת הדרופלט

- ב-DigitalOcean: **Create → Droplet**.
- Image: **Ubuntu 24.04 LTS**.
- גודל: מומלץ **2 GB RAM** ומעלה (בנייה של Next צורכת זיכרון; ב-1GB הוסיפו swap).
- הוסיפו את מפתח ה-SSH שלכם.
- צרו, והתחברו:

```bash
ssh root@DROPLET_IP
```

(אופציונלי, אם בחרתם 1GB — הוסיפו swap):

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## 2. התקנת Docker

```bash
apt-get update && apt-get install -y ca-certificates curl git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update && apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## 3. קוד והגדרות

```bash
git clone https://github.com/greenlad24/sportz.git
cd sportz
cp .env.example .env
nano .env
```

מלאו ב-`.env` לפחות:

```
NEXT_PUBLIC_SITE_URL=https://your-domain.com
# אימות: או מפתח API, או access token (לא שניהם)
ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_AUTH_TOKEN=        # חלופה: Bearer/OAuth access token
CRON_SECRET=<מחרוזת אקראית>
CLAUDE_MODEL=claude-sonnet-4-6
# Upstash לא נדרש בדרופלט - השאירו ריק
```

## 4. הרצה

```bash
docker compose up -d --build
```

- `web` רץ על פורט 3000, `scheduler` יפעיל את מנוע הניוז כל 5 דקות.
- בדיקה: `curl http://localhost:3000/robots.txt`
- לוגים: `docker compose logs -f web` / `docker compose logs -f scheduler`
- הרצה ידנית מיידית: `curl -X POST "http://localhost:3000/api/refresh?key=$CRON_SECRET"`

## 5. דומיין + Nginx + SSL

הצביעו רשומת **A** של הדומיין ל-IP של הדרופלט, ואז:

```bash
apt-get install -y nginx
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
```

צרו `/etc/nginx/sites-available/sportz`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/sportz /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# SSL חינמי
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 6. עדכון גרסה

```bash
cd sportz && git pull && docker compose up -d --build
```

## 7. אינדוקס ב-Google

1. אמתו את הדומיין ב-[Google Search Console](https://search.google.com/search-console).
2. הגישו: `https://your-domain.com/sitemap.xml` ו-`https://your-domain.com/news-sitemap.xml`.
3. ל-Google News: הגישו את האתר דרך [Publisher Center](https://publishercenter.google.com/).

---

## פתרון תקלות

- **המנוע לא כותב כתבות**: ודאו ש-`ANTHROPIC_API_KEY` תקין; `docker compose logs scheduler`.
- **403 בשאיבת מקורות**: חלק מהאתרים חוסמים IP של ספקי ענן. בדקו `docker compose logs web`
  בזמן refresh. אם מקור חוסם — אפשר לנתב אותו דרך proxy (ראו `src/lib/sources.ts`).
- **שגיאת זיכרון בבנייה**: הוסיפו swap (סעיף 1) או שדרגו ל-2GB.
