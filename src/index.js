// require("dotenv").config({path: './env'});
import dotenv from "dotenv";
import connectDB from "./db/index.js";


dotenv.config({path: '.env'});

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







// import express from "express";

// const app = express();

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