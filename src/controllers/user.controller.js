import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshToken = async (userId) => {
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};
    }catch(error){
        throw new ApiError(500, "Token generation failed");
    }
}

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
    // console.log(fullName);

    if(!fullName || !email || !password || !username){
        // res.status(400);
        // throw new Error("Please fill all the fields");
        throw new ApiError(400, "Please fill all the fields");
    }

    // User.findOne({email: email})
    const existedUser = await User.findOne({
        $or: [
            {email},
            {username}
        ]
    })

    if(existedUser){
        throw new ApiError(409, "User already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverLocalPath = req.files?.cover[0]?.path;

    let coverLocalPath;
    if(req.files && Array.isArray(req.files.cover) && req.files.cover.length > 0){
        coverLocalPath = req.files.cover[0].path;
    }

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

const loginUser = asyncHandler( async (req, res) => {
    // req.body -> data
    //username,email
    //find the user
    // password check
    // access and refresh token
    // send cookies
    console.log(req.body);
    const { username , email, password} = req.body;
    if(!username && !email){
        throw new ApiError(400, "Please provide username or email");
    }

    const user = await User.findOne({
        $or: [
            {username},
            {email}
        ]
    })

    if(!user){
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid  = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401, "Password is incorrect");
    }

    // const accessToken = user.generateAccessToken();
    // const refreshToken = user.generateRefreshToken();

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");   

    const options = {
        httpOnly: true,
        secure: true
    }
    
    return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)    
    .json(new ApiResponse(200,
        {
            user: loggedInUser,accessToken, refreshToken
        },
        "User logged in successfully"
    ))
})

const logoutUser = asyncHandler(async (req, res) => {
    // clear cookies , remove refresh token from db
    
    await User.findByIdAndUpdate(req.user._id, {
        $set: {
            refreshToken: undefined
        }
    }, {
        new: true
    });

    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, null, "User logged out successfully"));
})


export { registerUser 
        , loginUser
        , logoutUser
};      

// import { asyncHandler } from "../utils/asyncHandler.js";
// import { ApiError } from "../utils/ApiError.js";
// import { User } from "../models/user.model.js";
// import { uploadToCloudinary } from "../utils/cloudinary.js";
// import { ApiResponse } from "../utils/ApiResponse.js";

// const registerUser = asyncHandler(async (req, res) => {
//     const { email, username } = req.body;

//     if (!email || !username) {
//         throw new ApiError(400, "Please fill all the fields");
//     }

//     const existedUser = await User.findOne({
//         $or: [
//             { email },
//             { username }
//         ]
//     });

//     if (existedUser) {
//         throw new ApiError(409, "User already exists");
//     }

//     let avatarUrl = null;
//     let coverUrl = null;

//     if (req.files) {
//         if (req.files.avatar) {
//             const avatarResult = await uploadToCloudinary(req.files.avatar[0].path);
//             avatarUrl = avatarResult.secure_url;
//         }
//         if (req.files.cover) {
//             const coverResult = await uploadToCloudinary(req.files.cover[0].path);
//             coverUrl = coverResult.secure_url;
//         }
//     }

//     const newUser = new User({
//         email,
//         username,
//         avatar: avatarUrl,
//         cover: coverUrl
//     });

//     await newUser.save();

//     res.status(201).json(new ApiResponse(201, "User registered successfully", newUser));
// });

// export { registerUser };