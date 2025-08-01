
const AppData = {
  user: null,
  cart: [],
  cartTotal: 0,
  products: []
};

// Загружаем корзину
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

// Обновление корзины
function updateCartTotal(amount, name) {
  AppData.cartTotal += amount;
  AppData.cart.push({ name, price: amount });

  localStorage.setItem('cartTotal', AppData.cartTotal);
  localStorage.setItem('cart', JSON.stringify(AppData.cart));

  document.getElementById('cart-total').textContent = `${AppData.cartTotal.toLocaleString('ru-RU')} ₽`;
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
  for (const group in grouped) {
    const groupBlock = document.createElement('div');
    groupBlock.className = 'product-group';
    groupBlock.innerHTML = `<h2>${group}</h2><div class="product-list"></div>`;

    grouped[group].forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';

      const fileName = product['фото']?.replaceAll('"', '').trim();
      const imagePath = `img/banner2/${fileName}`;
      const price = Number(product['цена']);

      card.innerHTML = `
        <img src="${imagePath}" alt="${product['название_товара']}">
        <p>${product['название_товара']}</p>
        <p class="weight">${product['граммовка']}</p>
        <button onclick="updateCartTotal(${price}, '${product['название_товара'].replaceAll("'", "\'")}')">
          🛒 ${price.toLocaleString('ru-RU')} ₽
        </button>
      `;

      groupBlock.querySelector('.product-list').appendChild(card);
    });

    container.appendChild(groupBlock);
  }
}

// Переключение вкладок
function switchTab(button) {
  document.querySelectorAll('.tabs button').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
}

// Инициализация Swiper
const swiper = new Swiper('.swiper-container', {
  loop: true,
  centeredSlides: true,
  slidesPerView: 'auto',
  spaceBetween: 10,
  autoplay: {
    delay: 3000,
    disableOnInteraction: false,
  },
  pagination: {
    el: '.swiper-pagination',
    clickable: true
  },
});

function renderProducts(data) {
  const grouped = {};

  for (const product of data) {
    const group = product['группа_товаров'];
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(product);
  }

  const container = document.getElementById('product-list');

  for (const group in grouped) {
    const groupBlock = document.createElement('div');
    groupBlock.className = 'product-group';
    groupBlock.innerHTML = `<h2>${group}</h2><div class="product-list"></div>`;

    const productList = groupBlock.querySelector('.product-list');
    const products = grouped[group];

    products.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';

      const fileName = product['фото']?.replaceAll('"', '').trim();
      const imagePath = `img/banner2/${fileName}`;
      const price = Number(product['цена']);

      card.innerHTML = `
        <img src="${imagePath}" alt="${product['название_товара']}" onclick='openModal(${JSON.stringify(product)})'>
        <p>${product['название_товара']}</p>
        <p class="weight">${product['граммовка']}</p>
        <button onclick="updateCartTotal(${price}, '${product['название_товара'].replaceAll("'", "\\'")}')">
          🛒 ${price.toLocaleString('ru-RU')} ₽
        </button>
      `;

      productList.appendChild(card);
    });

    // 👇 Добавляем "пустышки", если товаров меньше 6
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

// Открытие модального окна
function openModal(product) {
  const modal = document.getElementById("product-modal");
  document.getElementById("modal-img").src = `img/banner2/${product['фото']}`;
  document.getElementById("modal-title").textContent = product['название_товара'];
  document.getElementById("modal-weight").textContent = product['граммовка'];
  document.getElementById("modal-desc").textContent = product['описание'] || 'Описание отсутствует';

  const price = Number(product['цена']);
  const action = document.getElementById("modal-action");

  const existing = AppData.cart.find(item => item.name === product['название_товара']);

  if (existing) {
    let count = existing.count || 1;
    action.innerHTML = `
      <div class="counter">
        <button onclick="changeCount(-1, '${product['название_товара']}')">−</button>
        <span id="count-value">${count}</span>
        <button onclick="changeCount(1, '${product['название_товара']}')">+</button>
      </div>
    `;
  } else {
    action.innerHTML = `
      <button onclick="addToCart('${product['название_товара']}', ${price})" id="add-to-cart-btn">
        🛒 ${price.toLocaleString('ru-RU')} ₽
      </button>
    `;
  }

  modal.classList.add("active");
}

function closeModal() {
  document.getElementById("product-modal").classList.remove("active");
}

function addToCart(name, price) {
  AppData.cart.push({ name, price, count: 1 });
  updateCartTotal(price, name);
  closeModal();
}

function changeCount(delta, name) {
  const item = AppData.cart.find(i => i.name === name);
  if (!item) return;

  item.count = (item.count || 1) + delta;

  if (item.count <= 0) {
    AppData.cart = AppData.cart.filter(i => i.name !== name);
  }

  localStorage.setItem('cart', JSON.stringify(AppData.cart));
  document.getElementById('count-value').textContent = item.count || 1;
}