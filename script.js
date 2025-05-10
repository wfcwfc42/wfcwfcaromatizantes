document.addEventListener('DOMContentLoaded', function () {
    // Inicializa o slider
    const swiper = new Swiper('.swiper', {
        loop: true,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
    });

    // Seletores do DOM
    const elements = {
        cartBtn: document.getElementById('cart-btn'),
        cartModal: document.getElementById('cart-modal'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        cartItemsContainer: document.getElementById('cart-items'),
        cartCount: document.getElementById('cart-count'),
        subtotalElement: document.getElementById('subtotal'),
        freteElement: document.getElementById('frete'),
        cartTotalElement: document.getElementById('cart-total'),
        checkoutBtn: document.getElementById('checkout-btn'),
        addressInput: document.getElementById('address'),
        addressWarn: document.getElementById('address-warn'),
        addToCartButtons: document.querySelectorAll('.add-carrinho'),
        filterButtons: document.querySelectorAll('.filtro-btn'),
        productCards: document.querySelectorAll('.produto-card')
    };

    // Constantes e estado do carrinho
    const SHIPPING_FEE = 0.0;
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    // parte de produtos por:
    const produtos = JSON.parse(localStorage.getItem('produtos')) || [];

    function renderProducts() {
        const container = document.getElementById('produtos-container');
        container.innerHTML = produtos.map(produto => `
        <div class="produto-card" data-categoria="${produto.category}">
            <img src="${produto.img}" alt="${produto.name}" class="produto-img">
            <div class="produto-info">
                <h3>${produto.name} - ${produto.category === '500ml' ? '500ml' : '1 Litro'}</h3>
                <p>${produto.desc}</p>
                <span class="preco">R$ ${produto.price}</span>
                <button class="add-carrinho" 
                    data-id="${produto.id}"
                    data-name="${produto.name}"
                    data-price="${produto.price}"
                    data-img="${produto.img}">
                    Adicionar ao Carrinho
                </button>
            </div>
        </div>
    `).join('');
    }

    // Chame renderProducts() após o carregamento da página
    document.addEventListener('DOMContentLoaded', renderProducts);

    // Funções utilitárias
    const utils = {
        formatCurrency: value => {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(value);
        },
        showToast: (message, type = 'success') => {
            Toastify({
                text: message,
                duration: 2000,
                close: true,
                gravity: "top",
                position: "left",
                backgroundColor: type === 'success' ? '#4CAF50' : '#FF5252',
                stopOnFocus: true
            }).showToast();
        },
        parsePrice: (price) => {
            if (typeof price === 'string') {
                return parseFloat(price.replace('R$', '').replace(',', '.').trim());
            }
            return parseFloat(price);
        }
    };

    // Atualiza o contador de itens no carrinho
    function updateCartCount() {
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        elements.cartCount.textContent = totalItems;
    }

    // Renderiza os itens do carrinho
    function renderCartItems() {
        elements.cartItemsContainer.innerHTML = cart.length === 0
            ? '<p class="carrinho-vazio">Seu carrinho está vazio</p>'
            : cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <img src="${item.img}" alt="${item.name}" class="cart-item-img">
                        <div>
                            <p class="cart-item-name">${item.name}</p>
                            <p class="cart-item-price">${utils.formatCurrency(item.price)}</p>
                        </div>
                    </div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn minus" data-id="${item.id}" type="button">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn plus" data-id="${item.id}" type="button">+</button>
                    </div>
                    <button class="remove-item" data-id="${item.id}" type="button">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
    }

    // Atualiza os valores totais do carrinho
    function updateCartTotals() {
        const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        const total = subtotal + SHIPPING_FEE;

        elements.subtotalElement.textContent = utils.formatCurrency(subtotal);
        elements.freteElement.textContent = utils.formatCurrency(SHIPPING_FEE);
        elements.cartTotalElement.textContent = utils.formatCurrency(total);
    }

    // Atualiza todo o carrinho (itens + totais + contador)
    function updateCart() {
        renderCartItems();
        updateCartTotals();
        updateCartCount();
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    // Manipulação do carrinho
    const cartActions = {
        addItem: (id, name, price, img) => {
            const existingItem = cart.find(item => item.id === id);

            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    id,
                    name,
                    price: utils.parsePrice(price),
                    quantity: 1,
                    img
                });
            }

            updateCart();
            utils.showToast(`${name} adicionado ao carrinho!`);
        },

        removeItem: (id) => {
            const itemIndex = cart.findIndex(item => item.id === id);
            if (itemIndex !== -1) {
                const [removedItem] = cart.splice(itemIndex, 1);
                updateCart();
                utils.showToast(`${removedItem.name} removido do carrinho!`);
            }
        },

        updateQuantity: (id, operation) => {
            const item = cart.find(item => item.id === id);
            if (!item) return;

            if (operation === 'decrease') {
                if (item.quantity > 1) {
                    item.quantity -= 1;
                } else {
                    cartActions.removeItem(id);
                    return;
                }
            } else if (operation === 'increase') {
                item.quantity += 1;
            }
            // // Atualiza a exibição do carrinho
            updateCart();
        },

        checkout: () => {
            if (cart.length === 0) {
                utils.showToast('Seu carrinho está vazio!', 'error');
                return;
            }

            const address = elements.addressInput.value.trim();
            if (!address) {
                elements.addressWarn.style.display = 'block';
                utils.showToast('Por favor, informe o endereço de entrega', 'error');
                return;
            }

            // Criar mensagem para WhatsApp
            const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
            const total = subtotal + SHIPPING_FEE;

            let message = `Olá, gostaria de fazer um pedido!\n\n*Itens do pedido:*\n`;
            message += cart.map(item =>
                `- ${item.name} (${item.quantity}x) - ${utils.formatCurrency(item.price * item.quantity)}`
            ).join('\n');

            message += `\n\n*Subtotal:* ${utils.formatCurrency(subtotal)}\n`;
            message += `*Frete:* ${utils.formatCurrency(SHIPPING_FEE)}\n`;
            message += `*Total:* ${utils.formatCurrency(total)}\n\n`;
            message += `*Endereço de entrega:*\n${address}\n\n`;
            message += `Por favor, confirme o pedido e informe as formas de pagamento disponíveis.`;



            // Feedback para o usuário
            utils.showToast('Pedido finalizado com sucesso! Obrigado pela compra!');

            // Abre o WhatsApp
            window.open(`https://wa.me/5588999049636?text=${encodeURIComponent(message)}`, '_blank');

            // Limpar carrinho e endereço
            cart = [];
            elements.addressInput.value = '';
            localStorage.removeItem('cart');
            // Atualiza a exibição do carrinho
            updateCart();

            //elements.addressWarn.style.display = 'none';

            // Fecha o modal do carrinho
            elements.cartModal.classList.remove('show');


        }
    };

    // Filtro de produtos
    function filterProducts(category) {
        elements.productCards.forEach(card => {
            card.style.display = (category === 'todos' || card.dataset.categoria === category)
                ? 'block'
                : 'none';
        });
    }

    // Event Listeners
    elements.cartBtn.addEventListener('click', e => {
        e.preventDefault();
        elements.cartModal.style.display = 'flex';
    });

    elements.closeModalBtn.addEventListener('click', () => {
        elements.cartModal.style.display = 'none';
    });

    elements.cartModal.addEventListener('click', e => {
        if (e.target === elements.cartModal) {
            elements.cartModal.style.display = 'none';
        }
    });

    elements.checkoutBtn.addEventListener('click', cartActions.checkout);

    elements.addToCartButtons.forEach(button => {
        button.addEventListener('click', () => {
            cartActions.addItem(
                button.dataset.id,
                button.dataset.name,
                button.dataset.price,
                button.dataset.img
            );
        });
    });

    elements.filterButtons.forEach(button => {
        button.addEventListener('click', function () {
            elements.filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            filterProducts(this.dataset.categoria);
        });
    });

    // Delegation para eventos dinâmicos
    document.addEventListener('click', function (e) {
        const removeBtn = e.target.closest('.remove-item-btn');
        if (removeBtn) {
            e.preventDefault();
            cartActions.removeItem(removeBtn.dataset.id);
            return;
        }

        const quantityBtn = e.target.closest('.quantity-btn');
        if (quantityBtn) {
            e.preventDefault();
            const operation = quantityBtn.classList.contains('minus') ? 'decrease' : 'increase';
            cartActions.updateQuantity(quantityBtn.dataset.id, operation);
        }
    });

    // Inicialização
    updateCart();

});