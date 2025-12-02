// Функціонал для обробки Реєстрації та Входу

document.addEventListener("DOMContentLoaded", () => {
  // ----------------------------------------------------
  // 1. Елементи DOM
  // ----------------------------------------------------
  const authModal = document.getElementById("authModal");
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");
  const messageContainer = document.getElementById("messageContainer");
  const registerLink = document.getElementById("showRegister");
  const loginLink = document.getElementById("showLogin");
  const modalTitle = document.getElementById("modalTitle");

  // Кнопка, яка відкриває модальне вікно (наприклад, "Вхід / Реєстрація")
  const openModalBtn = document.getElementById("openAuthModal");

  // Кнопка закриття (X)
  const closeModalBtn = document.getElementById("closeModal");

  // ----------------------------------------------------
  // 2. Утилітарні функції
  // ----------------------------------------------------

  /** Відображає повідомлення користувачеві */
  function displayMessage(text, isError = false) {
    messageContainer.textContent = text;
    messageContainer.className = isError
      ? "p-2 mt-4 text-red-700 bg-red-100 rounded"
      : "p-2 mt-4 text-green-700 bg-green-100 rounded";
    messageContainer.style.display = "block";
  }

  /** Приховує повідомлення */
  function clearMessage() {
    messageContainer.textContent = "";
    messageContainer.style.display = "none";
  }

  /** Перемикає відображення форм */
  function showForm(formType) {
    clearMessage();
    if (formType === "register") {
      modalTitle.textContent = "Реєстрація";
      registerForm.style.display = "block";
      loginForm.style.display = "none";
    } else {
      modalTitle.textContent = "Вхід";
      registerForm.style.display = "none";
      loginForm.style.display = "block";
    }
  }

  // ----------------------------------------------------
  // 3. Обробники подій для UI
  // ----------------------------------------------------

  // Відкриття модального вікна
  openModalBtn.addEventListener("click", () => {
    authModal.style.display = "flex";
    // Показуємо форму реєстрації за замовчуванням
    showForm("register");
  });

  // Закриття модального вікна
  closeModalBtn.addEventListener("click", () => {
    authModal.style.display = "none";
    clearMessage();
  });

  // Перемикання на форму входу
  loginLink.addEventListener("click", (e) => {
    e.preventDefault();
    showForm("login");
  });

  // Перемикання на форму реєстрації
  registerLink.addEventListener("click", (e) => {
    e.preventDefault();
    showForm("register");
  });

  // Закриття при кліку поза вікном
  window.addEventListener("click", (event) => {
    if (event.target === authModal) {
      authModal.style.display = "none";
      clearMessage();
    }
  });

  // ----------------------------------------------------
  // 4. Функції API (Реєстрація та Вхід)
  // ----------------------------------------------------

  /** * Надсилає дані на бек-енд та обробляє відповідь.
   * @param {string} endpoint - /api/register або /api/login
   * @param {object} data - Об'єкт з даними форми
   * @param {HTMLElement} formElement - Елемент форми для очищення
   */
  async function submitAuth(endpoint, data, formElement) {
    clearMessage();

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        // Успішна відповідь (наприклад, статус 201 або 200)
        displayMessage(result.message, false);
        formElement.reset();
        // Тут можна було б закрити модальне вікно або оновити UI
        console.log("Дані користувача:", result.user);
      } else {
        // Помилка (наприклад, 400, 401, 409)
        displayMessage(result.message || "Невідома помилка.", true);
      }
    } catch (error) {
      console.error("Помилка підключення:", error);
      displayMessage("Помилка підключення до сервера.", true);
    }
  }

  // ----------------------------------------------------
  // 5. Обробка відправки форм
  // ----------------------------------------------------

  // Обробка форми РЕЄСТРАЦІЇ
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const email = e.target.email.value;
    const password = e.target.password.value;

    submitAuth("/api/register", { username, email, password }, registerForm);
  });

  // Обробка форми ВХОДУ
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    submitAuth("/api/login", { email, password }, loginForm);
  });

  // Показуємо форму реєстрації при першому відкритті (хоча це вже зроблено)
  // showForm('register');
});
