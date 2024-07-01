const imgContainer = document.getElementById('img-container')
const mainImage = document.getElementById('main-image');

imgContainer.addEventListener('mousemove', e =>{
    const x = e.clientX - e.target.offsetLeft
    const y = e.clientY - e.target.offsetTop
    console.log(x,y)
    mainImage.style.transformOrigin = `${x}px ${y}px`
    mainImage.style.transform = "scale(3)"
})

imgContainer.addEventListener('mouseleave', e =>{
    mainImage.style.transformOrigin = "center"
   mainImage.style.transform = "scale(1)"
})



document.querySelectorAll('.thumbnail').forEach(thumbnail => {
    thumbnail.addEventListener('click', function() {
        
        mainImage.src = this.src;
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const countInput = document.getElementById('countInput');
    const productId = document.getElementById('productId').value;
    const priceInput = document.getElementById('priceInput').value;
    const incrementBtn = document.getElementById('incrementBtn');
    const decrementBtn = document.getElementById('decrementBtn');
    const submitBtn = document.getElementById('submitBtn');
    const wishlistForm = document.getElementById('wishlistForm');
    const wishlistBtn = document.getElementById('wishlistBtn');


    incrementBtn.addEventListener('click', () => {
        let currentValue = parseInt(countInput.value);
        countInput.value = currentValue + 1;
    });

    decrementBtn.addEventListener('click', () => {
        let currentValue = parseInt(countInput.value);
        if (currentValue > 1) {
            countInput.value = currentValue - 1;
        }
    });

    submitBtn.addEventListener('click', async () => {
        const cart = {
            product: productId,
            count: parseInt(countInput.value),
            price: parseFloat(priceInput)
        };

        try {
            const response = await fetch('/user/cart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cart: [cart] }) // Send as an array
            });

            if (response.ok) {
                window.location.href = '/cart'
                // Optionally, you can show a success message to the user
            } else {
                console.error('Failed to submit cart');
                // Optionally, you can show an error message to the user
            }
        } catch (error) {
            console.error('Error:', error);
            // Optionally, you can show an error message to the user
        }
    });

    wishlistForm.addEventListener('submit', async(event) =>{
        event.preventDefault()
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        try {
            const response = await fetch('/product/wishlist', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            if (response.ok) {
                
                if (wishlistBtn.classList.contains('btn-warning')) {
                    wishlistBtn.textContent = 'Wishlisted';
                    wishlistBtn.classList.remove('btn-warning');
                    wishlistBtn.classList.add('btn-success');
                    Swal.fire({
                        title: 'Added to Wishlist!',
                        text: 'This item has been added to your wishlist.',
                        icon: 'success',
                        showConfirmButton: false,
                        timer: 2000,
                        customClass: {
                            popup: 'animated fadeInDown'
                        }
                    });
                } else {
                    wishlistBtn.textContent = 'Wishlist';
                    wishlistBtn.classList.remove('btn-success');
                    wishlistBtn.classList.add('btn-warning');
                    Swal.fire({
                        title: 'Owchh',
                        text: `Product removed from wishlist`,
                        icon: 'error',
                        showConfirmButton: false,  
                        timer: 2000, 
                        customClass: {
                          popup: 'animated fadeInDown'
                        }
                      }); 
                }
                // window.location.reload()
                // Optionally, you can show a success message to the user
            } else {
                console.error('Failed to submit cart');
                // Optionally, you can show an error message to the user
            }
        } catch (error) {
            console.log(error) 
        }
    })
});
