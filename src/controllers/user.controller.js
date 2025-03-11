import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { Subscription } from "../models/subscription.model.js";

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

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(400, "Refresh token is missing");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?.id);
    
        if(!user){
            throw new ApiError(401, "Unauthorized");
        }
    
        if(user.refreshToken !== incomingRefreshToken){
            throw new ApiError(401, "Unauthorized");
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {newAccessToken , newRefreshToken} = await generateAccessAndRefreshToken(user._id);
    
        return res
        .status(200)
        .cookie("refreshToken", newRefreshToken, options)
        .cookie("accessToken", newAccessToken, options)
        .json(new ApiResponse(200, {newAccessToken, refreshToken : newRefreshToken}, "Token refreshed successfully"));
    
    } catch (error) {
        throw new ApiError(401, "Unauthorized");
        
    }
})

const changeCurrentPassword = asyncHandler(async(req , res) => {
    const {currentPassword, newPassword} = req.body;

    if(!currentPassword || !newPassword){
        throw new ApiError(400, "Please provide current and new password");
    }

    const user = await User.findById(req.user._id);

    if(!user){
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(currentPassword);

    if(!isPasswordValid){
        throw new ApiError(401, "Current password is incorrect");
    }

    user.password = newPassword;
    await user.save(
        {validateBeforeSave: false}
    );

    return res.status(200).json(new ApiResponse(200, null, "Password changed successfully"));
})

const getCurrentUser = asyncHandler(async(req , res) => {
    // return res.status(200).json(200, req.user, "User found successfully");
    return res.status(200).json(new ApiResponse(200, req.user, "User found successfully"));
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body;
    if(!fullName || !email){
        throw new ApiError(400, "Please provide full name and email");
    }

    const user = await User.findByIdAndUpdate(req.user._id, {
        $set: {
            fullName,
            email
        }
    }, {
        new: true
    }
    ).select("-password -refreshToken");

    return res.status(200).json(new ApiResponse(200, user, "Account details updated successfully"));
})

const updateUserAvatar = asyncHandler(async(req, res) => {

    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Please upload an avatar");
    }

    const avatar = await uploadToCloudinary(avatarLocalPath);

    if(!avatar){
        throw new ApiError(500, "Avatar upload failed");
    }

    const user = await User.findByIdAndUpdate(req.user._id, {
        $set: {
            avatar: avatar.url
        }
    }, {
        new: true
    }.select("-password -refreshToken"));

    return res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully"));

})

const updateUserCover = asyncHandler(async(req, res) => {
    
        const coverLocalPath = req.file?.path;
    
        if(!coverLocalPath){
            throw new ApiError(400, "Please upload a cover");
        }
    
        const cover = await uploadToCloudinary(coverLocalPath);
    
        if(!cover){
            throw new ApiError(500, "Cover upload failed");
        }
    
        const user = await User.findByIdAndUpdate(req.user._id, {
            $set: {
                cover: cover.url
            }
        }, {
            new: true
        }.select("-password -refreshToken"));

        return res.status(200).json(new ApiResponse(200, user, "Cover updated successfully"));
    
})

const getUserChannelProfile = asyncHandler(async(req, res) => {

    const {username} = req.params;

    if(!username){
        throw new ApiError(400, "Please provide username");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username
            }
        },
        {
            $lookup: {
                from : "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as : "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                SubscriberCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $in: [req.user._id, "$subscribers.subscriber"],
                    then: true,
                    else: false
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
                cover: 1,
                SubscriberCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "Channel not found");
    }

    return res.status(200).json(new ApiResponse(200, channel[0], "Channel found successfully"));
    
})

export { registerUser 
        , loginUser
        , logoutUser
        , refreshAccessToken
        , changeCurrentPassword
        , getCurrentUser    
        , updateAccountDetails
        , updateUserAvatar
        , updateUserCover
        , getUserChannelProfile
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