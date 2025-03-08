import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    // res.status(200).json({
    //     message: "ok"
    // });
    //get user data from frontend
    // validation - not empty
    // check if user already exists
    // check for image, check for avatar
    // upload them to cloudinary
    // create user object - create entry in db
    // remove password from user object
    // check for user creation
    // return response

    const {fullName , email , password, username} = req.body;
    console.log(fullName);

    if(!fullName || !email || !password || !username){
        // res.status(400);
        // throw new Error("Please fill all the fields");
        throw new ApiError(400, "Please fill all the fields");
    }

    // User.findOne({email: email})
    const existedUser = User.findOne({
        $or: [
            {email},
            {username}
        ]
    })

    if(existedUser){
        throw new ApiError(409, "User already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverLocalPath = req.files?.cover[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Please upload an avatar");
    }

    const avatar = await uploadToCloudinary(avatarLocalPath);
    const cover = await uploadToCloudinary(coverLocalPath);

    if(!avatar){
        throw new ApiError(500, "Avatar upload failed");
    }

    const user = await User.create({
        fullName,
        email,
        password,
        username : username.toLowerCase(),
        avatar: avatar.url,
        cover: cover?.url || null   
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser){
        throw new ApiError(500, "User creation failed");
    }

    // res.status(201).json({
    //     success: true,
    //     message: "User created successfully",
    //     data: createdUser
    // });

    return res.status(201).json(
        new ApiResponse(201, "User created successfully", createdUser)
    )

});


export { registerUser };