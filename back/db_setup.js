require("dotenv").config(); // Завантажує змінні з .env
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

async function setupDatabase() {
  // Спочатку створюємо таблиці, якщо вони не існують
  // УВАГА: Прибрано зайві пробіли/рядки на початку, щоб уникнути SQL-помилки 42601
  const tableCreationQuery = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS doctors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  phone VARCHAR(15),
  email VARCHAR(100) UNIQUE
);

CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  doctor_id INT REFERENCES doctors(id),
  appointment_date TIMESTAMP NOT NULL,
  reason TEXT
);
`;
  await pool.query(tableCreationQuery);
  console.log("Tables created successfully.");

  // Додаємо тестових лікарів, якщо їх ще немає
  const checkDoctors = await pool.query("SELECT COUNT(*) FROM doctors");
  if (parseInt(checkDoctors.rows[0].count) === 0) {
    console.log("Inserting sample doctors...");
    const insertDoctorsQuery = `
INSERT INTO doctors (name, specialty, phone, email) VALUES 
('Доктор Сміт', 'Кардіолог', '1234567890', 'smith@med.com'),
('Доктор Джонсон', 'Терапевт', '0987654321', 'johnson@med.com'),
('Доктор Іваненко', 'Хірург', '0011223344', 'ivanenko@med.com');
`;
    await pool.query(insertDoctorsQuery);
    console.log("Sample doctors inserted.");
  }
}

setupDatabase()
  .then(() => {
    console.log("Setup finished successfully.");
  })
  .catch((err) => {
    console.error("Error during database setup:", err);
    process.exit(1);
  })
  .finally(() => {
    console.log("Database setup script has finished execution.");
    pool.end();
  });
