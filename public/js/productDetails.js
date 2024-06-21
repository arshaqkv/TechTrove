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

    wishlistBtn.addEventListener('click', () => {
        // Handle adding to wishlist
    });
});
