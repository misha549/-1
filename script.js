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

function switchTab(button) {
  document.querySelectorAll('.tabs button').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
}

let cartTotal = 0;
function updateCartTotal(amount, name) {
  cartTotal += amount;
  localStorage.setItem('cartTotal', cartTotal);
  document.getElementById('cart-total').textContent = `${cartTotal.toLocaleString('ru-RU')} ₽`;

  const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
  cartItems.push({ name, price: amount });
  localStorage.setItem('cart', JSON.stringify(cartItems));
}

cartTotal = parseInt(localStorage.getItem('cartTotal')) || 0;
document.getElementById('cart-total').textContent = `${cartTotal.toLocaleString('ru-RU')} ₽`;

fetch('товары_обновленный.csv')
  .then(res => res.text())
  .then(csvText => {
    const { data } = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true
    });

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
          <button onclick="updateCartTotal(${price}, '${product['название_товара'].replaceAll("'", "\\'")}')">
  🛒 ${price.toLocaleString('ru-RU')} ₽
</button>
        `;

        groupBlock.querySelector('.product-list').appendChild(card);
      });

      container.appendChild(groupBlock);
    }
  });

