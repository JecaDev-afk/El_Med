// document.addEventListener("DOMContentLoaded", ...) спрацьовує, коли весь HTML
// документ повністю завантажено та розібрано.
document.addEventListener('DOMContentLoaded', () => {
  // --- КОНФІГУРАЦІЯ ---
  const API_URL = 'http://localhost:3000'; // Адреса вашого бекенд-сервера
  const APPOINTMENT_ENDPOINT = '/api/appointments';
  const DOCTORS_ENDPOINT = '/api/doctors';
  const USER_APPOINTMENTS_ENDPOINT = '/api/user/appointments'; // НОВИЙ ENDPOINT
  const REGISTER_ENDPOINT = '/register';
  const LOGIN_ENDPOINT = '/login';
  const REDIRECT_CABINET = '/pages/user_cabinet.html';
  const REDIRECT_HOME = '/';

  // --- ЗМІННІ DOM (Общие) ---
  const userCabinetLink = document.getElementById('userCabinetLink');
  const authLinks = document.getElementById('authLinks');
  const userMenu = document.getElementById('userMenu');
  const userNameDisplay = document.getElementById('userNameDisplay');
  const authModal = document.getElementById('authModal');
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');
  const messageContainer = document.getElementById('messageContainer');
  const registerLink = document.getElementById('showRegister');
  const loginLink = document.getElementById('showLogin');
  const modalTitle = document.getElementById('modalTitle');
  const openModalBtn = document.getElementById('openAuthModal');
  const closeModalBtn = document.getElementById('closeModal');
  const logoutBtn = document.getElementById('logoutBtn');

  // --- ЗМІННІ DOM (Форма запису, тільки на appointment.html) ---
  const appointmentForm = document.getElementById('appointmentForm');
  const appointmentMessage = document.getElementById('appointmentMessage');
  const doctorSelect = document.getElementById('doctor_id');

  // --- ЗМІННІ DOM (Кабінет користувача, тільки на user_cabinet.html) ---
  const appointmentsList = document.getElementById('appointmentsList'); // НОВИЙ елемент

  // --- Утилітарні функції (АВТЕНТИФІКАЦІЯ) ---

  function getCurrentUser() {
    const userJson = localStorage.getItem('user');
    try {
      if (!userJson) return null;

      const user = JSON.parse(userJson);

      // ГАРАНТІЯ: Якщо є ID, але немає user_id, ми його додаємо
      if (user && user.id && !user.user_id) {
        user.user_id = user.id;
      }

      return user;
    } catch (e) {
      console.error('Помилка парсингу даних користувача з localStorage:', e);
      localStorage.removeItem('user');
      return null;
    }
  }

  function updateUIVisibility() {
    const user = getCurrentUser();

    if (user) {
      if (authLinks) authLinks.style.display = 'none';
      if (userMenu) userMenu.style.display = 'block';
      if (userNameDisplay) userNameDisplay.textContent = `Привіт, ${user.username}!`;
      if (userCabinetLink) userCabinetLink.style.display = 'block';
    } else {
      if (authLinks) authLinks.style.display = 'block';
      if (userMenu) userMenu.style.display = 'none';
      if (userCabinetLink) userCabinetLink.style.display = 'none';
    }
  }

  function displayMessage(container, text, isError = false) {
    if (!container) return;
    container.textContent = text;
    container.className = isError ? 'error-message' : 'success-message';
    container.style.display = 'block';
  }

  function clearMessage(container) {
    if (!container) return;
    container.textContent = '';
    container.style.display = 'none';
  }

  function showForm(formType) {
    clearMessage(messageContainer);
    if (!modalTitle || !registerForm || !loginForm) return;

    if (formType === 'register') {
      modalTitle.textContent = 'Реєстрація';
      registerForm.style.display = 'block';
      loginForm.style.display = 'none';
    } else {
      modalTitle.textContent = 'Вхід';
      registerForm.style.display = 'none';
      loginForm.style.display = 'block';
    }
  }

  // --- ЛОГІКА АВТОРИЗАЦІЇ/ВИХОДУ ---

  function handleLogout() {
    localStorage.removeItem('user');
    if (
      window.location.pathname.includes('user_cabinet.html') ||
      window.location.pathname.includes('appointment.html')
    ) {
      window.location.href = REDIRECT_HOME;
    } else {
      updateUIVisibility();
    }
  }

  function checkAuthStatus() {
    const user = getCurrentUser();
    const currentPage = window.location.pathname;

    if (
      (currentPage.includes('user_cabinet.html') || currentPage.includes('appointment.html')) &&
      !user
    ) {
      window.location.href = REDIRECT_HOME;
      return true;
    }
    return false;
  }

  async function submitAuth(type, data) {
    clearMessage(messageContainer);

    const endpoint = type === 'register' ? REGISTER_ENDPOINT : LOGIN_ENDPOINT;

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Сталася невідома помилка на сервері.');
      }
      displayMessage(messageContainer, result.message, false);

      localStorage.setItem('user', JSON.stringify(result.user));

      setTimeout(() => {
        window.location.href = REDIRECT_CABINET;
      }, 1000);
    } catch (error) {
      console.error('Помилка авторизації:', error);
      displayMessage(messageContainer, error.message, true);
    }
  }

  // --- ЛОГІКА ЗАВАНТАЖЕННЯ ЛІКАРІВ ---
  async function loadDoctors() {
    if (!doctorSelect) return;

    try {
      const response = await fetch(`${API_URL}${DOCTORS_ENDPOINT}`);
      const doctors = await response.json();

      if (!response.ok) {
        throw new Error(doctors.message || 'Не вдалося завантажити список лікарів.');
      }

      doctorSelect.innerHTML = `<option value="" disabled selected>--- Виберіть лікаря ---</option>`;

      doctors.forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor.id;
        option.textContent = `${doctor.name} (${doctor.specialty})`;
        doctorSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Помилка завантаження лікарів:', error);
      if (doctorSelect) {
        doctorSelect.innerHTML = `<option value="" disabled selected>Помилка завантаження</option>`;
      }
      displayMessage(appointmentMessage, error.message, true);
    }
  }

  // --- ЛОГІКА ЗАПИСУ НА ПРИЙОМ ---
  async function submitAppointment(data) {
    const container = appointmentMessage;
    clearMessage(container);
    const user = getCurrentUser();

    if (!user || !user.user_id) {
      displayMessage(container, 'Ви не авторизовані. Будь ласка, увійдіть.', true);
      setTimeout(() => {
        window.location.href = REDIRECT_HOME;
      }, 1500);
      return;
    }

    // ДОДАЄМО user_id до корисного навантаження
    const appointmentPayload = {
      ...data,
      user_id: user.user_id,
    };

    try {
      displayMessage(container, 'Обробка запису...', false);

      const response = await fetch(`${API_URL}${APPOINTMENT_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Помилка при записі на прийом. Перевірте дані.');
      }

      displayMessage(container, 'Успішно! Запис підтверджено.', false);

      setTimeout(() => {
        window.location.href = REDIRECT_CABINET;
      }, 1500);
    } catch (error) {
      console.error('Помилка відправки запису:', error);
      displayMessage(container, error.message, true);
    }
  }

  // --- НОВА ЛОГІКА: ЗАВАНТАЖЕННЯ ТА ВІДОБРАЖЕННЯ ЗАПИСІВ ---
  async function loadUserAppointments() {
    if (!appointmentsList) return; // Не на сторінці кабінету

    const user = getCurrentUser();

    if (!user || !user.user_id) {
      appointmentsList.innerHTML = `<p class="error-message">Ви не авторизовані. Неможливо завантажити записи.</p>`;
      return;
    }

    try {
      // Запит до нового маршруту з ID користувача
      const response = await fetch(
        `${API_URL}${USER_APPOINTMENTS_ENDPOINT}?user_id=${user.user_id}`
      );
      const appointments = await response.json();

      if (!response.ok) {
        throw new Error(appointments.message || 'Помилка завантаження записів.');
      }

      if (appointments.length === 0) {
        appointmentsList.innerHTML = `<p>У вас поки що немає запланованих записів. <a href="/pages/appointment.html">Записатися зараз.</a></p>`;
        return;
      }

      let htmlContent = '';
      appointments.forEach(app => {
        // Форматуємо дату
        const date = new Date(app.appointment_date);
        // Додамо перевірку на валідність дати, щоб уникнути помилок форматування
        if (isNaN(date)) {
          console.error('Недійсний формат дати:', app.appointment_date);
          return; // Пропускаємо недійсний запис
        }

        const formattedDate = date.toLocaleDateString('uk-UA', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });
        const formattedTime = date.toLocaleTimeString('uk-UA', {
          hour: '2-digit',
          minute: '2-digit',
        });

        htmlContent += `
                  <div class="appointment-card">
                      <h3>👩‍⚕️ ${app.doctor_name} (${app.specialty})</h3>
                      <p><strong>Дата:</strong> ${formattedDate}</p>
                      <p><strong>Час:</strong> ${formattedTime}</p>
                      <p class="reason-text"><strong>Причина:</strong> ${
                        app.reason || 'Не вказано'
                      }</p>
                  </div>
              `;
      });

      appointmentsList.innerHTML = htmlContent;
    } catch (error) {
      console.error('Помилка завантаження записів:', error);
      appointmentsList.innerHTML = `<p class="error-message">Не вдалося завантажити записи: ${error.message}</p>`;
    }
  }

  // --- ОСНОВНИЙ КОНТРОЛЕР ---

  if (checkAuthStatus()) {
    return;
  }

  updateUIVisibility();

  // Завантаження списку лікарів, якщо на appointment.html
  if (doctorSelect) {
    loadDoctors();
  }

  // Викликаємо завантаження записів, якщо ми на сторінці user_cabinet.html
  if (appointmentsList) {
    loadUserAppointments();
  }

  // Обробники UI (кнопки, модальне вікно)
  // Открытие/закрытие модального окна через класс и управление доступностью
  let lastFocusedElement = null;

  function openAuthModal() {
    if (!authModal) return;
    lastFocusedElement = document.activeElement;
    authModal.classList.add('is-open');
    authModal.setAttribute('aria-hidden', 'false');
    // Фокусируем кнопку закрытия для удобства клавиатурной навигации
    if (closeModalBtn) closeModalBtn.focus();
  }

  function closeAuthModal() {
    if (!authModal) return;
    authModal.classList.remove('is-open');
    authModal.setAttribute('aria-hidden', 'true');
    clearMessage(messageContainer);
    if (lastFocusedElement) lastFocusedElement.focus();
  }

  if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
      showForm('login');
      openAuthModal();
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      closeAuthModal();
    });
    // also close on ESC
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeAuthModal();
    });
  }

  if (loginLink) {
    loginLink.addEventListener('click', e => {
      e.preventDefault();
      showForm('login');
    });
  }

  if (registerLink) {
    registerLink.addEventListener('click', e => {
      e.preventDefault();
      showForm('register');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  if (registerForm) {
    registerForm.addEventListener('submit', e => {
      e.preventDefault();
      const username = e.target.username.value;
      const email = e.target.email.value;
      const password = e.target.password.value;
      submitAuth('register', { username, email, password });
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const email = e.target.email.value;
      const password = e.target.password.value;
      submitAuth('login', { email, password });
    });
  }

  // --- ОБРОБНИК ФОРМИ ЗАПИСУ НА ПРИЙОМ ---
  if (appointmentForm) {
    appointmentForm.addEventListener('submit', e => {
      e.preventDefault();

      const doctor_id = e.target.doctor_id.value;
      const appointment_date = e.target.appointment_date.value;
      const appointment_time = e.target.appointment_time.value;
      const reason = e.target.reason.value;

      // Додаткова клієнтська перевірка
      if (!doctor_id || !appointment_date || !appointment_time) {
        displayMessage(appointmentMessage, 'Будь ласка, заповніть усі необхідні поля.', true);
        return;
      }

      submitAppointment({
        doctor_id,
        appointment_date,
        appointment_time,
        reason,
      });
    });
  }

  window.addEventListener('click', event => {
    if (event.target === authModal) {
      closeAuthModal();
    }
  });

  // --- ЛОГІКА АНІМАЦІЇ SCROLL-REVEAL ---

  function setupScrollReveal() {
    const observer = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
      }
    );

    document.querySelectorAll('.reveal').forEach(element => {
      observer.observe(element);
    });
  }

  setupScrollReveal();
});
