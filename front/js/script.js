// document.addEventListener("DOMContentLoaded", ...) спрацьовує, коли весь HTML
// документ повністю завантажено та розібрано.
document.addEventListener("DOMContentLoaded", () => {
  // --- КОНФІГУРАЦІЯ ---
  const API_URL = "http://localhost:3000"; // Адреса вашого бекенд-сервера
  const REDIRECT_CABINET = "/pages/user_cabinet.html";
  const REDIRECT_HOME = "/pages/index.html"; // --- ЗМІННІ DOM ---

  const userCabinetLink = document.getElementById("userCabinetLink");
  const authLinks = document.getElementById("authLinks");
  const userMenu = document.getElementById("userMenu");
  const userNameDisplay = document.getElementById("userNameDisplay"); // Примітка: authModal, registerForm, loginForm, messageContainer - ці елементи // повинні бути визначені в HTML-файлі, якщо логіка модального вікна буде використовуватися. // Оскільки їх немає на сторінці about.html, вони можуть бути null.
  const authModal = document.getElementById("authModal");
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");
  const messageContainer = document.getElementById("messageContainer");
  const registerLink = document.getElementById("showRegister");
  const loginLink = document.getElementById("showLogin");
  const modalTitle = document.getElementById("modalTitle");
  const openModalBtn = document.getElementById("openAuthModal");
  const closeModalBtn = document.getElementById("closeModal");
  const logoutBtn = document.getElementById("logoutBtn"); // --- Утилітарні функції (АВТЕНТИФІКАЦІЯ) ---

  function updateUIVisibility() {
    const user = localStorage.getItem("user");

    if (user) {
      // Користувач авторизований
      const userData = JSON.parse(user);
      if (authLinks) authLinks.style.display = "none";
      if (userMenu) userMenu.style.display = "block";
      if (userNameDisplay)
        userNameDisplay.textContent = `Привіт, ${userData.username}!`;
      if (userCabinetLink) userCabinetLink.style.display = "block";
    } else {
      // Користувач НЕ авторизований
      if (authLinks) authLinks.style.display = "block";
      if (userMenu) userMenu.style.display = "none";
      if (userCabinetLink) userCabinetLink.style.display = "none";
    }
  }

  function displayMessage(text, isError = false) {
    if (!messageContainer) return;
    messageContainer.textContent = text; // Використовуємо простіші класи, оскільки Tailwind CSS тут не підключено
    messageContainer.className = isError ? "error-message" : "success-message";
    messageContainer.style.display = "block";
  }

  function clearMessage() {
    if (!messageContainer) return;
    messageContainer.textContent = "";
    messageContainer.style.display = "none";
  }

  function showForm(formType) {
    clearMessage();
    if (!modalTitle || !registerForm || !loginForm) return;

    if (formType === "register") {
      modalTitle.textContent = "Реєстрація";
      registerForm.style.display = "block";
      loginForm.style.display = "none";
    } else {
      modalTitle.textContent = "Вхід";
      registerForm.style.display = "none";
      loginForm.style.display = "block";
    }
  }  // --- ЛОГІКА АВТОРИЗАЦІЇ/ВИХОДУ ---
  /**      * Обробляє вихід із системи
   */

  function handleLogout() {
    localStorage.removeItem("user"); // Перенаправляємо на головну сторінку, якщо знаходимося в кабінеті, // інакше просто оновлюємо UI на поточній сторінці.
    if (window.location.pathname.includes("user_cabinet.html")) {
      window.location.href = REDIRECT_HOME;
    } else {
      updateUIVisibility();
    }
  }
  /**      * Перевіряє, чи авторизований користувач, і захищає сторінки
   */

  function checkAuthStatus() {
    const user = localStorage.getItem("user");
    const currentPage = window.location.pathname; // Захист сторінки кабінету

    if (currentPage.includes("user_cabinet.html") && !user) {
      window.location.href = REDIRECT_HOME;
      return true;
    }
    return false;
  }
  /**
   * Обробляє вхід або реєстрацію, спілкуючись з Node.js сервером
   */

  async function submitAuth(type, data) {
    clearMessage();

    const endpoint = type === "register" ? "/register" : "/login";

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Сталася невідома помилка на сервері."
        );
      } // УСПІХ

      displayMessage(result.message, false); // Зберігаємо дані користувача в пам'яті браузера

      localStorage.setItem("user", JSON.stringify(result.user)); // Перенаправлення

      setTimeout(() => {
        window.location.href = REDIRECT_CABINET;
      }, 1000);
    } catch (error) {
      console.error("Auth Error:", error);
      displayMessage(error.message, true);
    }
  } // --- ОБРОБНИКИ ПОДІЙ (АВТЕНТИФІКАЦІЯ) --- // Обробники UI (кнопки, модальне вікно)

  if (openModalBtn) {
    openModalBtn.addEventListener("click", () => {
      if (authModal) authModal.style.display = "flex"; // Використовуємо flex, як у CSS
      showForm("register");
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      if (authModal) authModal.style.display = "none";
      clearMessage();
    });
  }

  if (loginLink) {
    loginLink.addEventListener("click", (e) => {
      e.preventDefault();
      showForm("login");
    });
  }

  if (registerLink) {
    registerLink.addEventListener("click", (e) => {
      e.preventDefault();
      showForm("register");
    });
  } // Вихід (додано обробник)

  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  } // Обробка форми РЕЄСТРАЦІЇ

  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const username = e.target.username.value;
      const email = e.target.email.value;
      const password = e.target.password.value;
      submitAuth("register", { username, email, password });
    });
  } // Обробка форми ВХОДУ

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = e.target.email.value;
      const password = e.target.password.value;
      submitAuth("login", { email, password });
    });
  } // Закриття модального вікна при кліку поза ним

  window.addEventListener("click", (event) => {
    if (event.target === authModal) {
      if (authModal) authModal.style.display = "none";
      clearMessage();
    }
  }); // --- ЛОГІКА АНІМАЦІЇ SCROLL-REVEAL (НОВА) ---

  function setupScrollReveal() {
    // Створюємо новий Intersection Observer
    const observer = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          // Якщо елемент увійшов у зону видимості (intersecting)
          if (entry.isIntersecting) {
            // Додаємо клас 'active', який запускає CSS-перехід
            entry.target.classList.add("active"); // Припиняємо спостерігати за цим елементом, щоб анімація спрацювала лише раз
            observer.unobserve(entry.target);
          }
        });
      },
      {
        // threshold: 0.1 означає, що анімація спрацює, коли 10% елемента буде видимим
        threshold: 0.1,
      }
    ); // Знаходимо всі елементи з класом 'reveal' по всьому документу

    document.querySelectorAll(".reveal").forEach((element) => {
      // Починаємо спостереження за елементом
      observer.observe(element);
    });
  } // --- ІНІЦІАЛІЗАЦІЯ --- // 1. Перевірка статусу автентифікації та захист сторінок

  if (checkAuthStatus()) {
    return; // Зупиняємо, якщо перенаправлення відбулося
  } // 2. Оновлення інтерфейсу користувача (меню)
  updateUIVisibility(); // 3. Ініціалізація анімації для всіх сторінок, де використовується клас .reveal

  setupScrollReveal();
});
