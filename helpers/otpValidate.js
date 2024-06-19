const oneMinuteExpiry = async(otpTime) =>{
    try{
        console.log(otpTime)
        const c_datetime = new Date()
        let timeDifference  = (otpTime - c_datetime.getTime()) / 1000;
        timeDifference /= 60
        console.log(timeDifference)
        if(Math.abs(timeDifference) > 1){
            return true
        }
        return false

    }catch(error){
        throw new Error(error)
    }
}

// const fiveMinuteExpiry = async(otpTime) =>{
//     try{
//         console.log(otpTime) 
//         const c_datetime = new Date()
//         let timeDifference  = (otpTime - c_datetime.getTime()) / 1000;
//         timeDifference /= 60
//         console.log(Math.abs(timeDifference))
//         if(Math.abs(timeDifference) > 2){
//             return true
//         }
//         return false

//     }catch(error){
//         throw new Error(error)
//     }
// }

module.exports = { oneMinuteExpiry }