require("dotenv").config(); // Завантажує змінні з .env
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});



async function setupDatabase() {
  const query = `
  create table if not exists users (
    id serial primary key,
    username varchar(100) not null,
    email varchar(100) not null unique,
    password varchar(100) not null
  );

  create table if not exists doctors (
    id serial primary key,
    name varchar(100) not null,
    specialty varchar(100) not null,
    phone varchar(15),
    email varchar(100) unique
  );
  create table if not exists appointments (
    id serial primary key,
    user_id int references users(id),
    doctor_id int references doctors(id),
    appointment_date timestamp not null,
    reason text
  );
  `;
}

setupDatabase()
    .then(() => {
    console.log("Setup finished successfully.")
    })
    .catch((err) => {
        console.error("Error during database setup:", err);
        process.exit(1);
    })
    .finally(() => {
        console.log("Database setup script has finished execution.");
        pool.end();
    });