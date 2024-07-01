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
          document.querySelector('.order-summary #firstPrice').textContent = `Price: Rs.${data.cartTotal}`; 
          const cartItem = document.querySelector(`.cart-item[data-product-id="${productId}"]`);
          cartItem.querySelector('.text-right strong').textContent = `${data.count}`; 
          cartItem.querySelector('.text-right .offerSavings').textContent = `Savings: ₹${data.offerSavings}`; 
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
          document.querySelector('.order-summary h5:last-of-type').textContent = `Total: Rs.${data.totalAfterDiscount}`;
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
  
    async function applyCoupon(couponCode) {
      try {
        const response = await fetch('/apply-coupon', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ couponCode }),
        });
  
        if (response.ok) {
          const data = await response.json();
          document.querySelector('.order-summary h5:last-of-type').textContent = `Total: Rs.${data.cartTotal}`;
          document.querySelector('.order-summary #couponDiscount').textContent = `Coupon Discount: Rs.${data.discount}`;
          document.querySelector('.error').textContent = ''; // Clear any previous error message
          document.getElementById('removeCouponBtn').style.display = 'block';

          Swal.fire({
            title: 'Coupon Applied!',
            text: `You saved Rs.${data.discount}`,
            icon: 'success',
            showConfirmButton: false,
            timer: 3000,
            customClass: {
              popup: 'animated fadeInDown'
            }
          });  

        } else {
          const error = await response.json();
          document.querySelector('.error').textContent = error.message;
        }
      } catch (error) {
        console.error('Error:', error);
        document.querySelector('.error').textContent = 'An unexpected error occurred. Please try again.';
      }
    }
  
    document.getElementById('couponForm').addEventListener('submit', function (event) {
      event.preventDefault(); 
      const couponCode = document.getElementById('couponCode').value;
      applyCoupon(couponCode);
    });
   
    document.getElementById('removeCouponBtn').addEventListener('click', async function () {
      try {
        const response = await fetch('/remove-coupon', {
          method: 'POST', 
          headers: {
            'Content-Type': 'application/json',
          },
        });
  
        if (response.ok) {
          const data = await response.json();
          document.getElementById('firstPrice').textContent = `Price: Rs.${data.cartTotal}`;
          document.getElementById('couponDiscount').textContent = ``;
          document.querySelector('.order-summary h5:last-of-type').textContent = `Total: Rs.${data.cartTotal}`;
          document.getElementById('removeCouponBtn').style.display = 'none';
          document.getElementById('couponCode').value = '';
          window.location.reload()
        } else {
          console.error('Failed to remove coupon');
        }
      } catch (error) {
        console.error('Error:', error);
      }
    });

});