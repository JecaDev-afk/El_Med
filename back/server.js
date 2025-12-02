// back/server.js
require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const path = require("path"); // *** ДОДАНО для коректної роботи зі шляхами

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для обробки JSON-запитів
app.use(express.json());

// ===============================================
// 1. НАЛАШТУВАННЯ СТАТИЧНИХ ФАЙЛІВ ТА КОРЕНЕВОГО МАРШРУТУ
// ===============================================

// Налаштовуємо обслуговування всіх файлів у папці 'front'
// __dirname — це поточна директорія ('back'). '..' йде на рівень вище ('El_Med').
// path.join(__dirname, '..', 'front') формує абсолютний шлях до папки 'front'.
const staticPath = path.join(__dirname, '..', 'front');
app.use(express.static(staticPath));

// Маршрут для кореневого шляху "/"
app.get("/", (req, res) => {
  // Формуємо абсолютний шлях до index.html
  const indexPath = path.join(staticPath, 'pages', 'index.html');
  
  // Надсилаємо index.html
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("Помилка відправки index.html:", err.message);
      res.status(404).send("Помилка 404: Файл не знайдено.");
    }
  });
});

// ===============================================
// 2. КОНФІГУРАЦІЯ БАЗИ ДАНИХ (PostgreSQL)
// ===============================================

// Налаштування пулу з'єднань PostgreSQL
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

// ===================================
// 3. Ендпоінт для РЕЄСТРАЦІЇ
// ===================================

app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;

  // 1. Перевірка вхідних даних
  if (!username || !email || !password) {
    return res.status(400).json({ message: "Всі поля обов'язкові." });
  }

  // 2. Хешування пароля
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // 3. SQL-запит для вставки нового користувача
  const query = `
    INSERT INTO users (username, email, password)
    VALUES ($1, $2, $3)
    RETURNING id, username, email;
  `;
  const values = [username, email, hashedPassword];

  let client;
  try {
    client = await pool.connect();

    // Перевірка, чи існує користувач з таким email
    const userExists = await client.query(
      "SELECT 1 FROM users WHERE email = $1",
      [email]
    );
    if (userExists.rows.length > 0) {
      client.release();
      return res
        .status(409)
        .json({ message: "Користувач з таким email вже зареєстрований." });
    }

    // Вставка нового користувача
    const result = await client.query(query, values);
    client.release();

    // Повернення успішного результату (без пароля!)
    res.status(201).json({
      message: "Реєстрація успішна!",
      user: result.rows[0],
    });
  } catch (error) {
    if (client) client.release();
    console.error("Помилка реєстрації:", error);
    // Якщо помилка пов'язана з порушенням інших обмежень (наприклад, username UNIQUE), 
    // PostgreSQL поверне інший код. Залишаємо 500 для загальних помилок.
    res.status(500).json({ message: "Помилка сервера під час реєстрації." });
  }
});

// ===================================
// 4. Ендпоінт для ВХОДУ (Приклад)
// ===================================

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  let client;
  try {
    client = await pool.connect();

    // 1. Знайти користувача за email
    const result = await client.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    client.release();

    const user = result.rows[0];

    if (!user) {
      return res
        .status(401)
        .json({ message: "Неправильний email або пароль." });
    }

    // 2. Порівняти хешований пароль
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Неправильний email або пароль." });
    }

    // Успішний вхід.
    // У реальному додатку тут видається JWT токен або створюється сесія.
    res
      .status(200)
      .json({
        message: "Вхід успішний!",
        user: { id: user.id, username: user.username, email: user.email },
      });
  } catch (error) {
    if (client) client.release();
    console.error("Помилка входу:", error);
    res.status(500).json({ message: "Помилка сервера під час входу." });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер працює на http://localhost:${PORT}`);
});