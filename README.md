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
- MongoDB Atlas + Mongoose
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
  - `src/models/` - סכמות Mongoose (User/Apartment ועוד)
  - `src/db.js` - חיבור ל-MongoDB באמצעות `MONGODB_URI`
  - `src/server.js` - bootstrap בלבד (האזנה לפורט)

כך אין ערבוב של לוגיקת תצוגה, HTTP, ולוגיקה עסקית בקובץ יחיד.

## איפה נשמר ה-DB ולמה

- הנתונים נשמרים ב-**MongoDB Atlas** (DB מנוהל בענן).
- האפליקציה מתחברת באמצעות משתנה סביבה: **`MONGODB_URI`**.

MongoDB מתאים לסקייל בזכות:
  1. אינדקסים גמישים ומהירים לחיפושים
  2. שיבוץ עומסים טוב לכמויות מסמכים גבוהות
  3. קלות הרחבה אופקית וניהול בענן

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

- `MONGODB_URI` - כתובת חיבור ל-MongoDB Atlas
- `MONGO_MAX_POOL_SIZE`, `MONGO_MIN_POOL_SIZE` - כוונון pool לביצועים
- `CRON_SECRET` - סוד לאימות קריאת Cron בפריסה

אם SMTP לא מוגדר, המיילים נשלחים למצב JSON (לצורכי פיתוח) ומוצגים בלוג.
אם SMTP כן מוגדר, המערכת שולחת מיילים אמיתיים בפועל.

## פריסה ל-Vercel כולל DB

הפרויקט מוכן לפריסה ל-Vercel עם:

- `api/index.js` כנקודת כניסה לשרת
- `vercel.json` עם Cron פעמיים בשבוע
- תמיכה ב-MongoDB Atlas דרך `MONGODB_URI`

### צעדי פריסה מומלצים

1. פתח cluster ב-MongoDB Atlas.
2. ב-Vercel הוסף משתני סביבה:
   - `MONGODB_URI`
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

- `title` / `כותרת`
- `neighborhood` / `שכונה`
- `rooms` / `חדרים`
- `price` / `מחיר`
- `address` / `כתובת`
- `description` / `תיאור`
- `contact_name` / `איש קשר`
- `contact_phone` / `טלפון`
- `contact_email` / `אימייל`

## מסלולים עיקריים

- `/` - יצירת בקשת חיפוש
- `/my-area` - כניסה עם קוד גישה
- `/guest-apartment/new` - פרסום דירה חינם
- `/admin/login` - התחברות מנהל
- `/admin` - דשבורד ניהול
