require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

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

// --- ОБСЛУГОВУВАННЯ СТАТИЧНИХ ФАЙЛІВ ---

const frontPath = path.join(__dirname, "../front");
app.use(express.static(frontPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontPath, "pages", "index.html"));
});

// ------------------------------------
// --- МАРШРУТИ АВТЕНТИФІКАЦІЇ ---
// ------------------------------------

// Маршрут: РЕЄСТРАЦІЯ (повертає user_id)
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
    const user = newUser.rows[0];
    res.json({
      message: "Реєстрація успішна!",
      user: { ...user, user_id: user.id },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Помилка сервера" });
  }
});

// Маршрут: ВХІД (повертає user_id)
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Користувача не знайдено" });
    }
    const user = result.rows[0]; // У реальному проекті тут має бути перевірка хешованого пароля, наприклад, за допомогою bcrypt
    if (user.password !== password) {
      return res.status(401).json({ message: "Невірний пароль" });
    }
    res.json({
      message: "Вхід успішний!",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        user_id: user.id,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Помилка сервера" });
  }
});

// ------------------------------------
// --- МАРШРУТИ API ---
// ------------------------------------

// МАРШРУТ 1: ОТРИМАННЯ СПИСКУ ЛІКАРІВ
app.get("/api/doctors", async (req, res) => {
  try {
    const doctors = await pool.query(
      "SELECT id, name, specialty FROM doctors ORDER BY name"
    );
    res.json(doctors.rows);
  } catch (err) {
    console.error("Помилка при отриманні списку лікарів:", err);
    res.status(500).json({ message: "Помилка сервера при отриманні лікарів" });
  }
});

// МАРШРУТ 2: ЗАПИС НА ПРИЙОМ (Повинна виправити помилку 400)
app.post("/api/appointments", async (req, res) => {
  const { user_id, doctor_id, appointment_date, appointment_time, reason } =
    req.body;

  if (!user_id || !doctor_id || !appointment_date || !appointment_time) {
    return res.status(400).json({
      message: "Будь ласка, заповніть усі необхідні поля (лікар, дата, час).",
    });
  }

  try {
    const appointmentTimestamp = `${appointment_date} ${appointment_time}`;

    const newAppointment = await pool.query(
      `INSERT INTO appointments (user_id, doctor_id, appointment_date, reason) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
      [user_id, doctor_id, appointmentTimestamp, reason]
    );

    res.json({
      message: "Запис успішно створено!",
      appointment: newAppointment.rows[0],
    });
  } catch (err) {
    console.error("Помилка при створенні запису:", err);
    if (err.code === "23503") {
      return res.status(400).json({
        message: "Помилка: неіснуючий лікар або недійсний користувач.",
      });
    }
    res.status(500).json({ message: "Помилка сервера при записі на прийом." });
  }
});

// МАРШРУТ 3: ОТРИМАННЯ ЗАПИСІВ КОРИСТУВАЧА (Повинна виправити помилку 404)
app.get("/api/user/appointments", async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res
      .status(400)
      .json({ message: "Необхідно вказати ID користувача." });
  }

  try {
    const appointments = await pool.query(
      `SELECT 
                a.id, 
                a.appointment_date, 
                a.reason,
                d.name AS doctor_name, 
                d.specialty
             FROM appointments a
             JOIN doctors d ON a.doctor_id = d.id
             WHERE a.user_id = $1
             ORDER BY a.appointment_date DESC`,
      [user_id]
    );

    res.json(appointments.rows);
  } catch (err) {
    console.error("Помилка при отриманні записів користувача:", err);
    res.status(500).json({ message: "Помилка сервера при отриманні записів." });
  }
});

// --- ЗАПУСК СЕРВЕРА: ПОВИНЕН БУТИ ОСТАННІМ ---
app.listen(port, () => {
  console.log(`Сервер працює на http://localhost:${port}`);
});
