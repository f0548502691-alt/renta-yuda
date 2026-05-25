# renta-yuda

מערכת MVP להשכרת דירות, הכוללת:

- פתיחת בקשת חיפוש ע"י משתמש אורח (ללא הרשמה)
- שמירת פרטי חיפוש ב-DB (שם, טלפון, אימייל, חדרים ושכונה)
- אזור אישי עם דירות רלוונטיות (ללא פרטי קשר עד אישור תשלום)
- אזור ניהול למנהל: סימון תשלום, הוספת דירות ידנית וייבוא מאקסל
- פרסום דירה חינם ע"י משתמש אורח
- שליחת מייל עדכוני דירות פעמיים בשבוע

## טכנולוגיות

- Node.js + Express
- EJS לתצוגה
- SQLite באמצעות better-sqlite3
- PostgreSQL (אופציונלי לפריסה דרך `DATABASE_URL`)
- Multer + xlsx לייבוא קבצי אקסל
- node-cron למשימות מתוזמנות
- nodemailer לשליחת מיילים

## הפרדת שכבות (Client / Server)

הפרויקט מחולק עכשיו בצורה שכבתית:

- **Client layer**:  
  - `views/` - תבניות UI ב-EJS  
  - `public/` - קבצי CSS/Assets סטטיים
- **Server API/Web layer**:  
  - `src/routes/` - הגדרת נתיבים בלבד
  - `src/controllers/` - קבלת בקשות HTTP והחזרת תגובות
  - `src/services/` - לוגיקה עסקית (תשלום, התאמות, דיוור, ייבוא)
  - `src/repositories/` - גישה לנתונים (DB)
  - `src/db.js` - תשתית SQLite + יצירת טבלאות
  - `src/server.js` - bootstrap בלבד (האזנה לפורט)

כך אין ערבוב של לוגיקת תצוגה, HTTP, ולוגיקה עסקית בקובץ יחיד.

## איפה נשמר ה-DB ולמה

- ברירת מחדל מקומית: **`data/renta-yuda.db`** (SQLite)
- בפריסה: ניתן להגדיר **`DATABASE_URL`** ולעבור אוטומטית ל-PostgreSQL

SQLite נבחר לפיתוח כי:
  1. מתאים ל-MVP ללא צורך בהתקנת שרת DB נפרד
  2. פשוט מאוד להרצה ולגיבוי (קובץ אחד)
  3. ביצועים טובים לעומסים קטנים-בינוניים של מערכת ראשונית

בפריסה לסקייל, PostgreSQL עדיף כי הוא תומך עומסים גבוהים יותר, חיבורים במקביל וגיבויים מנוהלים.

## התקנה והרצה

```bash
npm install
npm start
```

השרת יעלה בכתובת: `http://localhost:3000`

## משתני סביבה נתמכים

- `PORT` - פורט להרצת השרת (ברירת מחדל: 3000)
- `SESSION_SECRET` - מפתח ל-session
- `ADMIN_USERNAME` - שם משתמש למנהל (ברירת מחדל: admin)
- `ADMIN_PASSWORD` - סיסמת מנהל (ברירת מחדל: admin123)
- `APP_BASE_URL` - כתובת בסיס ללינקים במיילים
- `MAIL_FROM` - כתובת שולח
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` - הגדרות SMTP
- `DATABASE_URL` - אם מוגדר, המערכת משתמשת ב-PostgreSQL במקום SQLite
- `PGSSL` - ערך `disable` לביטול SSL ב-PostgreSQL מקומי
- `CRON_SECRET` - סוד לאימות קריאת Cron בפריסה

אם SMTP לא מוגדר, המיילים נשלחים למצב JSON (לצורכי פיתוח) ומוצגים בלוג.
אם SMTP כן מוגדר, המערכת שולחת מיילים אמיתיים בפועל.

## פריסה ל-Vercel כולל DB

הפרויקט מוכן לפריסה ל-Vercel עם:

- `api/index.js` כנקודת כניסה לשרת
- `vercel.json` עם Cron פעמיים בשבוע
- תמיכה ב-PostgreSQL דרך `DATABASE_URL`

### צעדי פריסה מומלצים

1. פתח DB חיצוני (למשל Neon/Supabase Postgres).
2. ב-Vercel הוסף משתני סביבה:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `APP_BASE_URL` (הדומיין של vercel)
   - `CRON_SECRET`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
3. בצע Deploy.
4. ודא שה-Cron של Vercel מופעל לנתיב `/internal/cron/newsletter`.

## פורמט אקסל לייבוא דירות

ניתן להשתמש בכותרות בעברית או באנגלית:

- `neighborhood` / `שכונה`
- `rooms` / `חדרים`
- `price` / `מחיר`
- `address` / `כתובת`
- `description` / `תיאור`
- `contact_name` / `איש קשר`
- `contact_phone` / `טלפון`
- `contact_email` / `אימייל`

`title` / `כותרת` הוא שדה אופציונלי בלבד. אם לא נשלח, המערכת יוצרת כותרת אוטומטית.

## מסלולים עיקריים

- `/` - יצירת בקשת חיפוש
- `/my-area` - כניסה עם קוד גישה
- `/guest-apartment/new` - פרסום דירה חינם
- `/admin/login` - התחברות מנהל
- `/admin` - דשבורד ניהול
