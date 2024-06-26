document.addEventListener('DOMContentLoaded', function () {
    async function updateCart(productId, newQuantity) {
      try {
        const response = await fetch('/cart/update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId, newQuantity }),
        });
  
        if (response.ok) {
          const data = await response.json();
          document.querySelector('.order-summary h5:last-of-type').textContent = `Total: Rs.${data.cartTotal}`;
          const cartItem = document.querySelector(`.cart-item[data-product-id="${productId}"]`);
          cartItem.querySelector('.text-right strong').textContent = `${data.count}`; 
        } else {
          console.error('Failed to update cart');  
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }
  
    window.decreaseQuantity = async function (productId) {
      const cartItem = document.querySelector(`.cart-item[data-product-id="${productId}"]`);
      const inputField = cartItem.querySelector('.count-input');
      let quantity = parseInt(inputField.value);
  
      if (quantity > 1) {
        quantity -= 1;
        inputField.value = quantity;
        await updateCart(productId, quantity);
      }
    };
  
    window.increaseQuantity = async function (productId) {
      const cartItem = document.querySelector(`.cart-item[data-product-id="${productId}"]`);
      const inputField = cartItem.querySelector('.count-input');
      let quantity = parseInt(inputField.value);
  
      quantity += 1;
      inputField.value = quantity;
      await updateCart(productId, quantity);
    };
  
     window.removeCartItem = async function (productId) {
      try {
        const response = await fetch('/cart/remove', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId }),
        });
  
        if (response.ok) {
          const data = await response.json();
          document.querySelector('.order-summary h5:last-of-type').textContent = `Total: Rs.${data.cartTotal}`;
          const cartItem = document.querySelector(`.cart-item[data-product-id="${productId}"]`);
          cartItem.remove();
          location.reload()
        } else {
          const error = await response.json();
          alert(error.message);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };
  
  });