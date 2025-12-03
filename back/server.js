require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path"); // Цей модуль допомагає працювати зі шляхами

const app = express();
const port = 3000;

// Налаштування з'єднання з БД
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

app.use(cors());
app.use(bodyParser.json());

// --- ВИПРАВЛЕНА ЧАСТИНА ---

// 1. Вказуємо шлях до папки front (виходимо з 'back' на рівень вгору і йдемо в 'front')
const frontPath = path.join(__dirname, "../front");

// 2. Дозволяємо серверу брати файли (CSS, JS, картинки) з папки front
app.use(express.static(frontPath));

// 3. Головна сторінка (оскільки index.html у вас лежить глибоко в pages)
app.get("/", (req, res) => {
  res.sendFile(path.join(frontPath, "pages", "index.html"));
});

// ---------------------------

// Маршрут: РЕЄСТРАЦІЯ
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (userCheck.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Користувач з таким email вже існує" });
    }
    const newUser = await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email",
      [username, email, password]
    );
    res.json({ message: "Реєстрація успішна!", user: newUser.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Помилка сервера" });
  }
});

// Маршрут: ВХІД
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Користувача не знайдено" });
    }
    const user = result.rows[0];
    if (user.password !== password) {
      return res.status(401).json({ message: "Невірний пароль" });
    }
    res.json({
      message: "Вхід успішний!",
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Помилка сервера" });
  }
});

app.listen(port, () => {
  console.log(`Сервер працює на http://localhost:${port}`);
});
