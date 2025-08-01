
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
