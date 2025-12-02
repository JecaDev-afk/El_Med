// front/js/script.js

// Отримання елементів DOM
const modal = document.getElementById("authModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeBtn = document.querySelector(".close-btn");
const registrationForm = document.getElementById("registrationForm");
const messageDisplay = document.getElementById("registrationMessage");

// 1. Функції для керування модальним вікном
function openModal() {
  modal.style.display = "block";
}

function closeModal() {
  modal.style.display = "none";
  messageDisplay.textContent = ""; // Очистити повідомлення при закритті
  registrationForm.reset(); // Очистити форму
}

// 2. Обробники подій для відкриття/закриття
openModalBtn.addEventListener("click", openModal);
closeBtn.addEventListener("click", closeModal);

// Закриття при кліку за межами вікна
window.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

// 3. Обробка відправки форми реєстрації
registrationForm.addEventListener("submit", async (e) => {
  e.preventDefault(); // Запобігти стандартній відправці форми

  const formData = new FormData(registrationForm);
  const data = Object.fromEntries(formData.entries());

  // Очистити попередні повідомлення
  messageDisplay.textContent = "Обробка...";
  messageDisplay.className = "message";

  try {
    // Використання fetch API для відправки даних на бек-енд
    const response = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      // Успішна реєстрація
      messageDisplay.textContent = `Успіх! Користувач ${result.user.username} зареєстрований.`;
      messageDisplay.classList.add("success");
      // Після успішної реєстрації можна закрити модальне вікно або перенаправити
      setTimeout(closeModal, 3000);
    } else {
      // Помилка від сервера (наприклад, email вже зайнятий)
      messageDisplay.textContent = `Помилка: ${result.message}`;
      messageDisplay.classList.add("error");
    }
  } catch (error) {
    // Помилка мережі
    console.error("Помилка при відправці даних:", error);
    messageDisplay.textContent =
      "Помилка мережі. Перевірте з'єднання з сервером.";
    messageDisplay.classList.add("error");
  }
});
