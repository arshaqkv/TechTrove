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