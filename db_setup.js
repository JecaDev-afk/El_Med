require('dotenv').config();
const { Pool } = require('pg');

// Налаштування з'єднання (ідентично до server.js для сумісності)
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
};

if (!process.env.DATABASE_URL) {
  dbConfig.user = process.env.PG_USER;
  dbConfig.host = process.env.PG_HOST;
  dbConfig.database = process.env.PG_DATABASE;
  dbConfig.password = process.env.PG_PASSWORD;
  dbConfig.port = process.env.PG_PORT;
}

const pool = new Pool(dbConfig);

async function setupDatabase() {
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
  console.log('Tables checked/created successfully.');

  // Додаємо тестових лікарів
  try {
    const checkDoctors = await pool.query('SELECT COUNT(*) FROM doctors');
    if (parseInt(checkDoctors.rows[0].count) === 0) {
      console.log('Inserting sample doctors...');
      const insertDoctorsQuery = `
        INSERT INTO doctors (name, specialty, phone, email) VALUES 
        ('Доктор Сміт', 'Кардіолог', '1234567890', 'smith@med.com'),
        ('Доктор Джонсон', 'Терапевт', '0987654321', 'johnson@med.com'),
        ('Доктор Іваненко', 'Хірург', '0011223344', 'ivanenko@med.com');
      `;
      await pool.query(insertDoctorsQuery);
      console.log('Sample doctors inserted.');
    }
  } catch (e) {
    console.error('Error checking/inserting doctors:', e);
  }
}

if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('Setup finished successfully.');
      pool.end();
    })
    .catch(err => {
      console.error('Error during database setup:', err);
      process.exit(1);
    });
}

module.exports = setupDatabase;
