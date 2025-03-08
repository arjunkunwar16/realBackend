// require("dotenv").config({path: './env'});
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({path: '.env'});

// console.log(process.env.PORT);

connectDB()
.then(() => {
    app.listen(process.env.PORT, () => {
        console.log(`App is running on port ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("Mongo DB connection failed ", err);
    throw err;
})

// ( async()=>{
//     try {   
//         await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
//         app.on("error", (err) => {
//             console.log("Error: ", err);
//             throw err;
//         });
//         app.listen(process.env.PORT, () => {
//             console.log(`App is running on port ${process.env.PORT}`);
//         });
//     } catch (error) {
//         console.log("Error: ", error);
//         throw err 
//     }
// })()