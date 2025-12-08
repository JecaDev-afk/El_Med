// document.addEventListener("DOMContentLoaded", ...) спрацьовує, коли весь HTML
// документ повністю завантажено та розібрано.
document.addEventListener('DOMContentLoaded', () => {
  console.log('script.js loaded:', window.location.pathname, ' — DOMContentLoaded');
  // --- КОНФІГУРАЦІЯ ---
  const API_URL = 'http://localhost:3000'; // Адреса вашого бекенд-сервера
  const APPOINTMENT_ENDPOINT = '/api/appointments';
  const DOCTORS_ENDPOINT = '/api/doctors';
  const USER_APPOINTMENTS_ENDPOINT = '/api/user/appointments';
  const REGISTER_ENDPOINT = '/register';
  const LOGIN_ENDPOINT = '/login';
  const REDIRECT_CABINET = '/pages/user_cabinet.html';
  const REDIRECT_HOME = '/';

  // --- ЗМІННІ DOM ---
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
  const openModalBtns = document.querySelectorAll('#openAuthModal, .openAuth, [data-open-auth]');
  const closeModalBtn = document.getElementById('closeModal');
  const logoutBtn = document.getElementById('logoutBtn');

  // --- ЗМІННІ DOM (Кабінет) ---
  const appointmentForm = document.getElementById('appointmentForm');
  const appointmentMessage = document.getElementById('appointmentMessage');
  const doctorSelect = document.getElementById('doctor_id');
  const appointmentsList = document.getElementById('appointmentsList');
  const appointmentHistoryList = document.getElementById('appointmentHistoryList');

  // --- ЛОГІКА АНІМАЦІЇ (SCROLL REVEAL) ---
  // Виносимо це в окрему функцію, щоб викликати її після завантаження даних
  function initScrollAnimations() {
    const reveals = document.querySelectorAll('.reveal');

    // Якщо елементів немає, виходимо
    if (reveals.length === 0) return;

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
        rootMargin: '0px 0px -50px 0px', // Активувати трохи раніше
      }
    );

    reveals.forEach(element => {
      // Спостерігаємо тільки за тими, хто ще не активний
      if (!element.classList.contains('active')) {
        observer.observe(element);
      }
    });
  }

  // --- Утилітарні функції ---

  function getCurrentUser() {
    const userJson = localStorage.getItem('user');
    try {
      if (!userJson) return null;
      const user = JSON.parse(userJson);
      if (user && user.id && !user.user_id) {
        user.user_id = user.id;
      }
      return user;
    } catch (e) {
      console.error('Помилка парсингу user:', e);
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

  // --- ДОПОМІЖНА ФУНКЦІЯ ДАТИ ---
  // Створює точний Date об'єкт, об'єднуючи дату з об'єкта та час з рядка
  function parseAppointmentDate(dateISOString, timeString) {
    try {
      // 1. Беремо дату з ISO рядка (який може бути UTC)
      const dateObj = new Date(dateISOString);
      if (isNaN(dateObj)) return null;

      // 2. Отримуємо компоненти дати (Рік, Місяць, День) у локальному контексті
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');

      // 3. Формуємо рядок "YYYY-MM-DD HH:MM:SS"
      // timeString зазвичай "HH:MM:SS"
      const fullString = `${year}-${month}-${day} ${timeString}`;

      // 4. Створюємо новий Date, який браузер сприйме як локальний
      return new Date(fullString);
    } catch (e) {
      console.error('Помилка парсингу дати:', e);
      return null;
    }
  }

  // --- ЛОГІКА АВТОРИЗАЦІЇ ---

  function handleLogout() {
    localStorage.removeItem('user');
    if (window.location.pathname.includes('user_cabinet.html')) {
      window.location.href = REDIRECT_HOME;
    } else {
      updateUIVisibility();
    }
  }

  function checkAuthStatus() {
    const user = getCurrentUser();
    const currentPage = window.location.pathname;
    if (currentPage.includes('user_cabinet.html') && !user) {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Помилка сервера.');

      displayMessage(messageContainer, result.message, false);
      localStorage.setItem('user', JSON.stringify(result.user));
      setTimeout(() => {
        window.location.href = REDIRECT_CABINET;
      }, 1000);
    } catch (error) {
      console.error('Auth error:', error);
      displayMessage(messageContainer, error.message, true);
    }
  }

  // --- ЛОГІКА ЗАВАНТАЖЕННЯ ДАНИХ ---
  async function loadDoctors() {
    if (!doctorSelect) return;
    try {
      const response = await fetch(`${API_URL}${DOCTORS_ENDPOINT}`);
      const doctors = await response.json();
      if (!response.ok) throw new Error('Помилка завантаження лікарів.');

      doctorSelect.innerHTML = `<option value="" disabled selected>--- Виберіть лікаря ---</option>`;
      doctors.forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor.id;
        option.textContent = `${doctor.name} (${doctor.specialty})`;
        doctorSelect.appendChild(option);
      });
    } catch (error) {
      console.error(error);
      doctorSelect.innerHTML = `<option value="" disabled selected>Помилка</option>`;
    }
  }

  async function submitAppointment(data) {
    const container = appointmentMessage;
    clearMessage(container);
    const user = getCurrentUser();

    if (!user || !user.user_id) {
      displayMessage(container, 'Авторизуйтесь, будь ласка.', true);
      return;
    }

    // 1. Формуємо локальний рядок часу
    const localDateTimeString = `${data.appointment_date} ${data.appointment_time}:00`;
    const localDate = new Date(localDateTimeString);

    if (isNaN(localDate.getTime())) {
      displayMessage(container, 'Некоректна дата.', true);
      return;
    }

    // 2. Конвертуємо в UTC для бекенду
    const appointmentPayload = {
      doctor_id: data.doctor_id,
      appointment_date: localDate.toISOString(),
      reason: data.reason,
      user_id: user.user_id,
    };

    try {
      displayMessage(container, 'Обробка...', false);
      const response = await fetch(`${API_URL}${APPOINTMENT_ENDPOINT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentPayload),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message || 'Помилка запису.');

      displayMessage(container, 'Успішно!', false);
      appointmentForm.reset();

      if (appointmentsList) {
        await loadUserAppointments();
        window.openTab(null, 'scheduledAppointments');
      }
    } catch (error) {
      displayMessage(container, error.message, true);
    }
  }

  function formatAppointmentsToHTML(appointments, isHistory = false) {
    let htmlContent = '';
    const statusText = isHistory ? 'Завершено' : 'Заплановано';
    const statusClass = isHistory ? 'status-completed' : 'status-scheduled';

    appointments.forEach(app => {
      // Використовуємо надійну функцію парсингу
      const date = parseAppointmentDate(app.appointment_date, app.appointment_time);

      if (!date) return;

      const formattedDate = date.toLocaleDateString('uk-UA', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      const formattedTime = app.appointment_time.substring(0, 5);

      // Додаємо картку. Клас reveal робить її спочатку невидимою.
      htmlContent += `
          <div class="appointment-card reveal">
              <div class="card-header">
                  <h3>👩‍⚕️ ${app.doctor_name} (${app.specialty})</h3>
                  <span class="${statusClass}">${statusText}</span>
              </div>
              <p><strong>Дата:</strong> ${formattedDate}</p>
              <p><strong>Час:</strong> ${formattedTime}</p>
              <p class="reason-text"><strong>Причина:</strong> ${app.reason || 'Не вказано'}</p>
          </div>
        `;
    });
    return htmlContent;
  }

  window.loadUserAppointments = async function () {
    if (!appointmentsList) return;
    const user = getCurrentUser();
    if (!user || !user.user_id) return;

    appointmentsList.innerHTML = `<p>Завантаження...</p>`;

    try {
      const response = await fetch(
        `${API_URL}${USER_APPOINTMENTS_ENDPOINT}?user_id=${user.user_id}`
      );
      if (!response.ok) throw new Error('Помилка сервера');

      const allAppointments = await response.json();
      const now = new Date();
      const futureAppointments = [];
      const pastAppointments = [];

      allAppointments.forEach(app => {
        // Парсимо дату надійно
        const appointmentDateTime = parseAppointmentDate(
          app.appointment_date,
          app.appointment_time
        );

        if (!appointmentDateTime) return;

        if (appointmentDateTime > now) {
          futureAppointments.push({ ...app, _parsedDate: appointmentDateTime });
        } else {
          pastAppointments.push({ ...app, _parsedDate: appointmentDateTime });
        }
      });

      // Сортування (використовуємо вже розпарсену дату)
      futureAppointments.sort((a, b) => a._parsedDate - b._parsedDate);
      pastAppointments.sort((a, b) => b._parsedDate - a._parsedDate);

      // Відображення
      if (futureAppointments.length === 0) {
        appointmentsList.innerHTML = `<p>У вас поки що немає запланованих записів. <a href="#" onclick="window.openTab(event, 'makeAppointment')">Записатися зараз.</a></p>`;
      } else {
        appointmentsList.innerHTML = formatAppointmentsToHTML(futureAppointments, false);
      }

      if (appointmentHistoryList) {
        if (pastAppointments.length === 0) {
          appointmentHistoryList.innerHTML = `<p>У вас поки що немає завершених прийомів.</p>`;
        } else {
          appointmentHistoryList.innerHTML = formatAppointmentsToHTML(pastAppointments, true);
        }
      }
      // SCROLL-BUTTON
      // --- КЛЮЧОВЕ ВИПРАВЛЕННЯ ВИДИМОСТІ ---
      // Запускаємо анімацію ПІСЛЯ того, як HTML було додано на сторінку
      setTimeout(initScrollAnimations, 100);
    } catch (error) {
      console.error(error);
      appointmentsList.innerHTML = `<p class="error-message">Помилка: ${error.message}</p>`;
    }
  };

  // --- ЛОГІКА ТАБІВ ---
  window.openTab = function (evt, tabName) {
    var i, tabContent, tabLinks;
    tabContent = document.getElementsByClassName('tab-content');
    for (i = 0; i < tabContent.length; i++) tabContent[i].style.display = 'none';

    tabLinks = document.getElementsByClassName('tablinks');
    for (i = 0; i < tabLinks.length; i++)
      tabLinks[i].className = tabLinks[i].className.replace(' active', '');

    const currentTab = document.getElementById(tabName);
    if (currentTab) currentTab.style.display = 'flex';

    if (evt && evt.currentTarget) {
      evt.currentTarget.className += ' active';
    } else {
      const btn = document.querySelector(`.tab button[onclick*='${tabName}']`);
      if (btn) btn.className += ' active';
    }
  };

  // --- ІНІЦІАЛІЗАЦІЯ ---

  // SCROLL-BUTTON LOGIC (Винесено за межі loadUserAppointments)
  function scrollUp() {
    const scrollUpBtn = document.getElementById('scroll-up');
    if (scrollUpBtn) {
      window.scrollY >= 350
        ? scrollUpBtn.classList.add("show-scroll")
        : scrollUpBtn.classList.remove("show-scroll");
    }
  }
  window.addEventListener("scroll", scrollUp);

  if (checkAuthStatus()) return;
  updateUIVisibility();

  if (doctorSelect) loadDoctors();

  if (appointmentsList) {
    loadUserAppointments();
    openTab(null, 'scheduledAppointments');
  }

  // Модальні вікна
  let lastFocusedElement = null;
  function openAuthModal() {
    if (!authModal) return;
    lastFocusedElement = document.activeElement;
    authModal.classList.add('is-open');
    authModal.setAttribute('aria-hidden', 'false');
    if (closeModalBtn) closeModalBtn.focus();
  }
  function closeAuthModal() {
    if (!authModal) return;
    authModal.classList.remove('is-open');
    authModal.setAttribute('aria-hidden', 'true');
    clearMessage(messageContainer);
    if (lastFocusedElement) lastFocusedElement.focus();
  }
  openModalBtns.forEach(btn =>
    btn.addEventListener('click', e => {
      e.preventDefault();
      showForm('login');
      openAuthModal();
    })
  );
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeAuthModal);
  if (loginLink)
    loginLink.addEventListener('click', e => {
      e.preventDefault();
      showForm('login');
    });
  if (registerLink)
    registerLink.addEventListener('click', e => {
      e.preventDefault();
      showForm('register');
    });
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  if (registerForm)
    registerForm.addEventListener('submit', e => {
      e.preventDefault();
      submitAuth('register', {
        username: e.target.username.value,
        email: e.target.email.value,
        password: e.target.password.value,
      });
    });
  if (loginForm)
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      submitAuth('login', { email: e.target.email.value, password: e.target.password.value });
    });

  if (appointmentForm) {
    appointmentForm.addEventListener('submit', e => {
      e.preventDefault();
      submitAppointment({
        doctor_id: e.target.doctor_id.value,
        appointment_date: e.target.appointment_date.value,
        appointment_time: e.target.appointment_time.value,
        reason: e.target.reason.value,
      });
    });
  }

  window.addEventListener('click', event => {
    if (event.target === authModal) closeAuthModal();
  });

  // Анімації тексту
  const user = getCurrentUser();
  const username = user ? user.username : 'Користувач';
  const out1 = document.querySelector('.Type-animation-out1');
  const out2 = document.querySelector('.Type-animation-out2');

  function typeText(element, text, speed) {
    if (!element) return;
    element.innerHTML = '';
    let i = 0;
    function type() {
      if (i < text.length) {
        element.innerHTML += text.charAt(i);
        i++;
        setTimeout(type, speed);
      }
    }
    type();
  }

  if (out1) typeText(out1, "E-Med - Здоров'я в один клік.", 100);
  if (out2 && window.location.pathname.includes('user_cabinet.html')) {
    typeText(out2, `Вітаємо у Вашому Кабінеті, ${username}!`, 50);
  }

  // Запуск ScrollReveal для статичних елементів
  initScrollAnimations();
});
