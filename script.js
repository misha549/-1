const AppData = {
  user: null,
  cart: [],
  cartTotal: 0,
  products: []
};

// Загружаем корзину из localStorage
AppData.cart = JSON.parse(localStorage.getItem('cart') || '[]');
AppData.cartTotal = parseInt(localStorage.getItem('cartTotal')) || 0;
document.getElementById('cart-total').textContent = `${AppData.cartTotal.toLocaleString('ru-RU')} ₽`;

// Подгружаем пользователя Telegram и телефон из users.csv
if (window.Telegram && Telegram.WebApp) {
  Telegram.WebApp.expand();

  const tgUser = Telegram.WebApp.initDataUnsafe?.user;

  if (tgUser) {
    AppData.user = {
      id: tgUser.id,
      first_name: tgUser.first_name,
      last_name: tgUser.last_name || '',
      username: tgUser.username || '',
      phone_number: null
    };

    fetch('users.csv')
      .then(res => res.text())
      .then(csvText => {
        const { data } = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true
        });

        const userRows = data.filter(row => String(row.telegram_id).trim() === String(AppData.user.id));

        if (userRows.length > 0) {
          userRows.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
          AppData.user.phone_number = userRows[0].phone_number;
        }

        const el = document.getElementById("tg-user-info");
        if (el) {
          const fullName = AppData.user.first_name + (AppData.user.last_name ? ' ' + AppData.user.last_name : '');
          const username = AppData.user.username ? '@' + AppData.user.username : '(без username)';
          const id = AppData.user.id;
          const phone = AppData.user.phone_number || '(не найден)';

          el.innerHTML = `
            👤 <b>${fullName}</b><br>
            🆔 Telegram ID: <code>${id}</code><br>
            🏷️ Username: ${username}<br>
            📞 Телефон: <code>${phone}</code>
          `;
        }
      });
  } else {
    const el = document.getElementById("tg-user-info");
    if (el) {
      el.textContent = "❌ Не удалось получить данные Telegram.";
    }
  }
}

// Загрузка товаров и отображение
fetch('товары_обновленный.csv')
  .then(res => res.text())
  .then(csvText => {
    const { data } = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true
    });

    AppData.products = data;
    renderProducts(data);
  });

// Отображение карточек товаров

function renderProducts(data) {
  const grouped = {};

  for (const product of data) {
    const group = product['группа_товаров'];
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(product);
  }

  const container = document.getElementById('product-list');
  container.innerHTML = '';

  // 🎯 Каталог по реальным группам из CSV
  const catalogContainer = document.getElementById('group-catalog');
  if (catalogContainer) {
    catalogContainer.innerHTML = '';

    // Сортировка по алфавиту
    const sortedGroups = Object.keys(grouped).sort();

    sortedGroups.forEach(group => {
      const catalogBtn = document.createElement('button');
      catalogBtn.textContent = group;
      catalogBtn.className = 'catalog-button';
      catalogBtn.onclick = () => {
        const groupBlock = document.querySelector(`[data-group="${group}"]`);
        if (groupBlock) {
          groupBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };
      catalogContainer.appendChild(catalogBtn);
    });
  }

  // 📦 Отображение товаров по группам
  for (const group in grouped) {
    const groupBlock = document.createElement('div');
    groupBlock.className = 'product-group';
    groupBlock.setAttribute('data-group', group);
    groupBlock.innerHTML = `<h2>${group}</h2><div class="product-list"></div>`;

    const productList = groupBlock.querySelector('.product-list');
    const products = grouped[group];

    products.forEach(product => {
      const fileName = product['фото']?.replaceAll('"', '').trim();
      const imagePath = `img/banner2/${fileName}`;
      const price = Number(product['цена']);

      const card = document.createElement('div');
      card.className = 'product-card';

      card.innerHTML = `
        <img src="${imagePath}" alt="${product['название_товара']}" onclick='openModal(${JSON.stringify(product)})'>
        <p>${product['название_товара']}</p>
        <p class="weight">${product['граммовка']}</p>
        <button onclick="addToCart('${product['название_товара'].replaceAll("'", "\\'")}', ${price})">
          🛒 ${price.toLocaleString('ru-RU')} ₽
        </button>
      `;

      productList.appendChild(card);
    });

    // ➕ Пустые карточки если < 6
    const minCards = 6;
    const missing = minCards - products.length;
    for (let i = 0; i < missing; i++) {
      const empty = document.createElement('div');
      empty.className = 'product-card empty';
      productList.appendChild(empty);
    }

    container.appendChild(groupBlock);
  }
}


// Открытие модального окна с правильным количеством товара
function openModal(product) {
  const modal = document.getElementById("product-modal");
  document.getElementById("modal-img").src = `img/banner2/${product['фото']}`;
  document.getElementById("modal-title").textContent = product['название_товара'];
  document.getElementById("modal-weight").textContent = product['граммовка'];
  document.getElementById("modal-desc").textContent = product['описание'] || 'Описание отсутствует';

  const price = Number(product['цена']);
  const action = document.getElementById("modal-action");

  const existing = AppData.cart.find(item => item.name === product['название_товара']);
  const count = existing ? existing.count : 0;

  if (count > 0) {
    action.innerHTML = `
      <div class="counter">
        <button id="dec-btn">−</button>
        <span id="count-value">${count}</span>
        <button id="inc-btn">+</button>
      </div>
    `;
    document.getElementById("dec-btn").onclick = () => changeCount(product['название_товара'], -1, price);
    document.getElementById("inc-btn").onclick = () => changeCount(product['название_товара'], +1, price);
  } else {
    action.innerHTML = `<button id="add-to-cart-btn">🛒 ${price.toLocaleString('ru-RU')} ₽</button>`;
    document.getElementById("add-to-cart-btn").onclick = () => addToCart(product['название_товара'], price);
  }

  modal.classList.add("active");
}

// Закрытие модального окна
function closeModal() {
  document.getElementById("product-modal").classList.remove("active");
}

// Добавление товара в корзину
function addToCart(name, price) {
  const item = AppData.cart.find(i => i.name === name);
  if (item) {
    item.count += 1;
  } else {
    AppData.cart.push({ name, price, count: 1 });
  }
  saveCartAndUpdateUI();
  // Обновляем модалку с новым количеством
  const product = AppData.products.find(p => p['название_товара'] === name);
  if (product) openModal(product);
}

// Изменение количества товара
function changeCount(name, delta, price) {
  const item = AppData.cart.find(i => i.name === name);
  if (!item) return;

  item.count += delta;

  if (item.count <= 0) {
    AppData.cart = AppData.cart.filter(i => i.name !== name);
    closeModal();
  } else {
    const countSpan = document.getElementById("count-value");
    if (countSpan) countSpan.textContent = item.count;
  }
  saveCartAndUpdateUI();
}

// Сохранение корзины и обновление суммы
function saveCartAndUpdateUI() {
  AppData.cartTotal = AppData.cart.reduce((sum, item) => sum + item.price * item.count, 0);
  localStorage.setItem('cart', JSON.stringify(AppData.cart));
  localStorage.setItem('cartTotal', AppData.cartTotal);
  document.getElementById('cart-total').textContent = `${AppData.cartTotal.toLocaleString('ru-RU')} ₽`;
}

// Переключение вкладок
function switchTab(button) {
  document.querySelectorAll('.tabs button').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
}

// Инициализация Swiper
const swiper = new Swiper('.swiper-container', {
  loop: true,
  slidesPerView: 'auto',
  centeredSlides: true,
  spaceBetween: 12,
  grabCursor: true,
  breakpoints: {
    0: {
      slidesPerView: 1.2,
      centeredSlides: true
    },
    600: {
      slidesPerView: 1.8
    },
    900: {
      slidesPerView: 2.5
    },
    1200: {
      slidesPerView: 3.2
    }
  },
  autoplay: {
    delay: 3000,
    disableOnInteraction: false,
  },
  pagination: {
    el: '.swiper-pagination',
    clickable: true
  }
});

