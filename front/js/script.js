// document.addEventListener("DOMContentLoaded", ...) спрацьовує, коли весь HTML
// документ повністю завантажено та розібрано.
document.addEventListener('DOMContentLoaded', () => {
  console.log('script.js loaded:', window.location.pathname, ' — DOMContentLoaded');
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
  // Поддерживаем несколько вариантов селекторов: id, класс или data-атрибут
  const openModalBtns = document.querySelectorAll('#openAuthModal, .openAuth, [data-open-auth]');
  console.log('openAuth buttons found:', openModalBtns ? openModalBtns.length : 0);
  const closeModalBtn = document.getElementById('closeModal');
  const logoutBtn = document.getElementById('logoutBtn');

  // --- ЗМІННІ DOM (Форма запису, тільки на appointment.html) ---
  const appointmentForm = document.getElementById('appointmentForm');
  const appointmentMessage = document.getElementById('appointmentMessage');
  const doctorSelect = document.getElementById('doctor_id');

  // --- ЗМІННІ DOM (Кабінет користувача, тільки на user_cabinet.html) ---
  const appointmentsList = document.getElementById('appointmentsList'); // Заплановані прийоми
  const appointmentHistoryList = document.getElementById('appointmentHistoryList'); // Історія прийомів

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

    /* Привітання переноситься у контролер сторінки кабінету користувача */

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

      // Після успішного запису оновлюємо список запланованих прийомів
      loadUserAppointments();

      // Якщо вкладка "Заплановані прийоми" не активна, перемикаємо на неї
      if (document.getElementById('scheduledAppointments')) {
        const scheduledButton = document.querySelector(
          ".tab button[onclick*='scheduledAppointments']"
        );
        if (scheduledButton) {
          scheduledButton.click();
        }
      }
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

    // --- ЛОГІКА ДЛЯ ЗАПЛАНОВАНИХ ПРИЙОМІВ (appointmentsList) ---
    // Тут потрібен код, який фільтрує лише майбутні прийоми (хоча ваш API може це робити)
    try {
      // Встановлюємо повідомлення про завантаження
      appointmentsList.innerHTML = `<p>Завантаження ваших майбутніх записів...</p>`;

      // Запит до нового маршруту з ID користувача
      const response = await fetch(
        `${API_URL}${USER_APPOINTMENTS_ENDPOINT}?user_id=${user.user_id}`
      );
      const allAppointments = await response.json();

      if (!response.ok) {
        throw new Error(allAppointments.message || 'Помилка завантаження записів.');
      }

      // Фільтруємо на майбутні записи (якщо API не фільтрує)
      const now = new Date();
      const futureAppointments = allAppointments.filter(app => {
        const appointmentDateTime = new Date(`${app.appointment_date}T${app.appointment_time}`);
        return appointmentDateTime > now;
      });

      // Заповнення списку
      if (futureAppointments.length === 0) {
        appointmentsList.innerHTML = `<p>У вас поки що немає запланованих записів. <a href="#" onclick="openTab(event, 'makeAppointment')">Записатися зараз.</a></p>`;
      } else {
        appointmentsList.innerHTML = formatAppointmentsToHTML(futureAppointments);
      }

      // --- ЛОГІКА ДЛЯ ІСТОРІЇ ПРИЙОМІВ (appointmentHistoryList) ---
      if (appointmentHistoryList) {
        appointmentHistoryList.innerHTML = `<p>Завантаження історії прийомів...</p>`;

        // Фільтруємо на минулі записи
        const pastAppointments = allAppointments.filter(app => {
          const appointmentDateTime = new Date(`${app.appointment_date}T${app.appointment_time}`);
          return appointmentDateTime <= now;
        });

        if (pastAppointments.length === 0) {
          appointmentHistoryList.innerHTML = `<p>У вас поки що немає завершених прийомів.</p>`;
        } else {
          appointmentHistoryList.innerHTML = formatAppointmentsToHTML(pastAppointments);
        }
      }
    } catch (error) {
      console.error('Помилка завантаження записів:', error);
      appointmentsList.innerHTML = `<p class="error-message">Не вдалося завантажити записи: ${error.message}</p>`;
      if (appointmentHistoryList) {
        appointmentHistoryList.innerHTML = `<p class="error-message">Не вдалося завантажити історію: ${error.message}</p>`;
      }
    }
  }

  // Нова функція для форматування HTML-контенту карток прийомів
  function formatAppointmentsToHTML(appointments) {
    let htmlContent = '';
    appointments.forEach(app => {
      // Якщо у вас окремі поля для дати і часу, об'єднуємо їх для створення об'єкта Date
      const date = new Date(`${app.appointment_date}T${app.appointment_time}`);

      if (isNaN(date)) {
        console.error('Недійсний формат дати/часу:', app.appointment_date, app.appointment_time);
        return;
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
    return htmlContent;
  }

  // --- НОВА ФУНКЦІЯ: ЛОГІКА ТАБІВ У КАБІНЕТІ КОРИСТУВАЧА ---
  window.openTab = function (evt, tabName) {
    var i, tabContent, tabLinks;

    // 1. Приховати весь вміст вкладок (використовуємо клас 'tab-content')
    tabContent = document.getElementsByClassName('tab-content');
    for (i = 0; i < tabContent.length; i++) {
      tabContent[i].style.display = 'none';
    }

    // 2. Видалити клас 'active' з усіх кнопок
    tabLinks = document.getElementsByClassName('tablinks');
    for (i = 0; i < tabLinks.length; i++) {
      tabLinks[i].className = tabLinks[i].className.replace(' active', '');
    }

    // 3. Показати поточну вкладку і встановити її як активну
    const currentTabElement = document.getElementById(tabName);
    if (currentTabElement) {
      // Для секцій, що містять інші елементи у стовпчик, краще використовувати 'flex'
      currentTabElement.style.display = 'flex';
    } else {
      console.error(`Елемент з ID ${tabName} не знайдено.`);
    }

    // Встановлюємо активний клас для кнопки, якщо подія передана
    if (evt && evt.currentTarget) {
      evt.currentTarget.className += ' active';
    } else {
      // Якщо викликано програмно (без події), шукаємо кнопку, щоб її активувати
      const programmaticButton = document.querySelector(`.tab button[onclick*='${tabName}']`);
      if (programmaticButton) {
        programmaticButton.className += ' active';
      }
    }
  };

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
    // Встановлюємо привітання для користувача
    const user = getCurrentUser();
    const cabinetWelcomeElement = document.getElementById('cabinetWelcome');
    if (cabinetWelcomeElement && user && user.username) {
      // Використовуємо textContent замість innerHTML, щоб уникнути конфлікту з Type-animation
      // Але для Type-animation ми вже зарезервували логіку нижче
      // cabinetWelcomeElement.textContent = `Вітаємо у Вашому Кабінеті, ${user.username}!`;
    }

    // Запускаємо логіку завантаження записів (як майбутніх, так і історії)
    loadUserAppointments();

    // Встановлюємо вкладку за замовчуванням: "Заплановані прийоми"
    // Викликаємо openTab програмно, передаючи null замість evt
    openTab(null, 'scheduledAppointments');
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

  if (openModalBtns && openModalBtns.length) {
    openModalBtns.forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        showForm('login');
        openAuthModal();
      });
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

  // КНОПКА ПРОКРУТКИ

  // Находим кнопку и элемент, к которому нужно скроллить
  const backToTopButton = document.querySelector('.back-to-top');
  const topElement = document.getElementById('top');

  // Проверяем, что элементы найдены
  if (backToTopButton && topElement) {
    // Показываем/скрываем кнопку при прокрутке
    window.addEventListener('scroll', () => {
      if (window.scrollY > window.innerHeight) {
        backToTopButton.style.display = 'block';
      } else {
        backToTopButton.style.display = 'none';
      }
    });

    // Прокручиваем плавно вверх при клике на кнопку
    backToTopButton.addEventListener('click', e => {
      e.preventDefault(); // Предотвращаем стандартное поведение ссылки
      topElement.scrollIntoView({
        behavior: 'smooth',
      });
    });
  }

  // ЛОГІКА АНІМАЦІЇ TYPE-ANIMATION
  // Адаптуємо текст для Type-animation-out2, щоб використовувати актуальне ім'я
  const user = getCurrentUser();
  const username = user ? user.username : 'Користувач';

  const text1 = "E-Med - Здоров'я в один клік.";
  const out1 = document.querySelector('.Type-animation-out1');
  const text2 = `Вітаємо у Вашому Кабінеті, ${username}!`; // Використовуємо отримане ім'я
  const out2 = document.querySelector('.Type-animation-out2');
  let position = 0;
  let speed1 = 100;
  let speed2 = 50;

  function typer1() {
    if (!out1) return; // защитный кэйс: если элемент отсутствует — выход
    if (position < text1.length) {
      out1.innerHTML += text1.charAt(position);
      position++;
      setTimeout(typer1, speed1);
    }
  }

  function typer2() {
    if (!out2) return;
    if (position < text2.length) {
      out2.innerHTML += text2.charAt(position);
      position++;
      setTimeout(typer2, speed2);
    }
  }

  // Запускаем анимацию только если найден целевой элемент,
  // чтобы избежать ошибки и прерывания дальнейших скриптов
  if (out1) {
    out1.innerHTML = '';
    typer1();
  }

  if (out2 && window.location.pathname.includes('user_cabinet.html')) {
    // Якщо ми в кабінеті, запускаємо typer2
    out2.innerHTML = '';
    position = 0; // Скидаємо позицію для другого тайпера
    typer2();
  }
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
