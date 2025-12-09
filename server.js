require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const setupDatabase = require('./db_setup');

const app = express();
// Хостинг автоматично надасть порт через змінну середовища PORT
const port = process.env.PORT || 3000;

// --- НАЛАШТУВАННЯ БАЗИ ДАНИХ (ПІДТРИМКА ХОСТИНГУ) ---
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
};

// Якщо DATABASE_URL немає (локальний режим), використовуємо дані з .env
if (!process.env.DATABASE_URL) {
  dbConfig.user = process.env.PG_USER;
  dbConfig.host = process.env.PG_HOST;
  dbConfig.database = process.env.PG_DATABASE;
  dbConfig.password = process.env.PG_PASSWORD;
  dbConfig.port = process.env.PG_PORT;
}

const pool = new Pool(dbConfig);

app.use(cors());
app.use(bodyParser.json());

// --- ОБСЛУГОВУВАННЯ СТАТИЧНИХ ФАЙЛІВ ---
// Зверніть увагу: шлях змінено, оскільки server.js тепер у корені
const frontPath = path.join(__dirname, 'front');
app.use(express.static(frontPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontPath, 'pages', 'index.html'));
});

// ------------------------------------
// --- МАРШРУТИ АВТЕНТИФІКАЦІЇ ---
// ------------------------------------

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Користувач з таким email вже існує' });
    }
    const newUser = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, password]
    );
    const user = newUser.rows[0];
    res.json({
      message: 'Реєстрація успішна!',
      user: { ...user, user_id: user.id },
    });
  } catch (err) {
    console.error('Помилка реєстрації:', err);
    res.status(500).json({ message: 'Помилка сервера при реєстрації користувача.' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Користувача не знайдено' });
    }
    const user = result.rows[0];
    if (user.password !== password) {
      return res.status(401).json({ message: 'Невірний пароль' });
    }
    res.json({
      message: 'Вхід успішний!',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        user_id: user.id,
      },
    });
  } catch (err) {
    console.error('Помилка входу:', err);
    res.status(500).json({ message: 'Помилка сервера при спробі входу.' });
  }
});

// ------------------------------------
// --- МАРШРУТИ API ---
// ------------------------------------

app.get('/api/doctors', async (req, res) => {
  try {
    const doctors = await pool.query('SELECT id, name, specialty FROM doctors ORDER BY name');
    res.json(doctors.rows);
  } catch (err) {
    console.error('Помилка при отриманні списку лікарів:', err);
    res.status(500).json({ message: 'Помилка сервера при отриманні лікарів' });
  }
});

app.post('/api/appointments', async (req, res) => {
  const { user_id, doctor_id, appointment_date, reason } = req.body;

  if (!user_id || !doctor_id || !appointment_date) {
    return res.status(400).json({
      message: 'Будь ласка, заповніть усі необхідні поля (лікар, дата, час).',
    });
  }

  try {
    const appointmentTimestamp = appointment_date;

    const newAppointment = await pool.query(
      `INSERT INTO appointments (user_id, doctor_id, appointment_date, reason) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
      [user_id, doctor_id, appointmentTimestamp, reason]
    );

    res.json({
      message: 'Запис успішно створено!',
      appointment: newAppointment.rows[0],
    });
  } catch (err) {
    console.error('Помилка при створенні запису:', err);
    if (err.code === '23503') {
      return res.status(400).json({
        message: 'Помилка: неіснуючий лікар або недійсний користувач.',
      });
    }
    res.status(500).json({ message: 'Помилка сервера при записі на прийом.' });
  }
});

app.get('/api/user/appointments', async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ message: 'Необхідно вказати ID користувача.' });
  }

  try {
    const appointments = await pool.query(
      `SELECT 
                 a.id, 
                 a.appointment_date::date AS appointment_date, 
                 a.appointment_date::time AS appointment_time, 
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
    console.error('Помилка при отриманні записів користувача:', err);
    res.status(500).json({ message: 'Помилка сервера при отриманні записів.' });
  }
});

// --- ЗАПУСК СЕРВЕРА ---
async function startServer() {
  try {
    await setupDatabase();
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Failed to initialize database:', err);
    // Не виходимо з процесу на хостингу, щоб логи збереглися, але сервер не впав миттєво
  }

  app.listen(port, () => {
    console.log(`Сервер працює на порту ${port}`);
  });
}

startServer();
