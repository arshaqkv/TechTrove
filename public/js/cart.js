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
        document.querySelector('.order-summary h5:last-of-type').textContent = `Total: Rs.${data.totalAfterDiscount}`;
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
    const stockCount = parseInt(cartItem.querySelector('.stock-count').textContent);
    console.log(stockCount)

    if (quantity < stockCount) {
      quantity += 1;
      inputField.value = quantity;
      await updateCart(productId, quantity);
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Stock Limit Exceeded',
        text: 'You cannot add more items than available in stock.',
        showConfirmButton: true,
      });
    }

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
        location.reload();
      } else {
        const error = await response.json();
        alert(error.message);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  window.applyCoupon = async function (couponCode) {
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
        const totalElement = document.querySelector('.order-summary h5:last-of-type');
        const discountElement = document.querySelector('.order-summary #couponDiscount');
        const errorElement = document.querySelectorAll('.error');
        const removeCouponBtn = document.getElementById('removeCouponBtn');
        const applyCouponBtn = document.querySelector('.coupon-section #applyCouponBtn');

      
        if (errorElement) {
          errorElement.textContent = ''; // Clear any previous error message
        }

        if(applyCouponBtn){
          applyCouponBtn.style.display = 'none'
        }

        if (removeCouponBtn) { 
          removeCouponBtn.style.display = 'block';
        } else {
          console.error('Remove coupon button not found');
        }


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

        // Close the modal after applying the coupon
        $('#couponModal').modal('hide');
        setTimeout(()=>{
          window.location.reload()
        },2000)
      } else {
        const error = await response.json();
        const errorElement = document.querySelector('.error');
        if (errorElement) {
          Swal.fire({
            title: error.message,
            text: 'Try another',
            icon: 'error',
            showConfirmButton: false,
            timer: 2000,
            customClass: {
              popup: 'animated fadeInDown'
            }
          });
          
        } else {
          console.error('Error element not found');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      const errorElement = document.querySelector('.error');
      if (errorElement) {
        errorElement.textContent = 'An unexpected error occurred. Please try again.';
      } else {
        console.error('Error element not found');
      }
    }
  };

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
        const discountElement = document.getElementById('couponDiscount');
        if (discountElement) {
          discountElement.remove();
        }
        document.querySelector('.order-summary h5:last-of-type').textContent = `Total: Rs.${data.cartTotal}`;
        document.getElementById('removeCouponBtn').style.display = 'none';
        document.getElementById('couponCode').value = '';
        window.location.reload();
      } else {
        console.error('Failed to remove coupon');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  });
});
