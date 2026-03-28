import { LikeModel } from "../modal/likeRequestModal.js";
import RegisterModel from "../modal/register.js";

// Utility to calculate age from DOB
const calculateAge = (dob) => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

// This is send Like controller
export const sendLike = async (req, res) => {
  const senderId = req.user.userId;
  const { receiverId } = req.body;

  if (!senderId || !receiverId || senderId === receiverId) {
    return res.status(400).json({
      success: false,
      message: 'Invalid like request'
    });
  }

  try {

    // 🔹 Step 1: check if already liked
    const existingLike = await LikeModel.findOne({
      senderId,
      receiverId
    });

    if (existingLike) {
      return res.status(400).json({
        success: false,
        message: 'Already liked'
      });
    }

    // 🔹 Step 2: create like
    const newLike = await LikeModel.create({
      senderId,
      receiverId,
      status: "liked"
    });

    return res.status(201).json({
      success: true,
      message: 'Added to wishlist ❤️',
      data: newLike
    });

  } catch (error) {

    console.error("Like Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

// To see the profile of the person to whom we have sent the like in this controller
export const getSentLikes = async (req, res) => {
  try {

    const userId = req.user.userId;

    // 🔹 Step 1: get ONLY liked data
    const likes = await LikeModel.find({
      senderId: userId,
      status: "liked" // 🔥 important filter
    })
      .populate({
        path: 'receiverId',
        select: `
          _id vmId firstName lastName dateOfBirth height religion caste designation
          annualIncome highestEducation city state currentCity currentState motherTongue
          gender profileImage updatedAt createdAt
        `
      })
      .sort({ createdAt: -1 })
      .lean();

    // 🔹 Step 2: age function
    const calculateAge = (dob) => {
      if (!dob) return null;
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    // 🔹 Step 3: format data
    const data = likes
      .filter(like => like.receiverId) // null safety
      .map((like) => {
        const user = like.receiverId;

        return {
          likeId: like._id,

          _id: user._id,
          vmId: user.vmId,
          name: `${user.firstName || ''} ${user.lastName || ''}`,
          age: calculateAge(user.dateOfBirth),

          height: user.height || '',
          caste: user.caste || '',
          designation: user.designation || '',
          religion: user.religion || '',
          profession: user.designation || '',
          salary: user.annualIncome || '',
          education: user.highestEducation || '',

          location: `${user.city || user.currentCity || ''}, ${user.state || user.currentState || ''}`,

          languages: Array.isArray(user.motherTongue)
            ? user.motherTongue.join(', ')
            : (user.motherTongue || ''),

          gender: user.gender || '',
          profileImage: user.profileImage || '',

          lastSeen: user.updatedAt || user.createdAt,
        };
      });

    return res.status(200).json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {

    console.error('Error getting sent likes:', error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// To see the profile of the person who sent me the text in this controller
export const getReceivedLikes = async (req, res) => {
  try {
    const userId = req.user.userId;
    const likes = await LikeModel.find({
      receiverId: userId,
      status: "liked"
    })
      .populate('senderId', `
         _id vmId firstName lastName dateOfBirth height religion caste occupation
        annualIncome highestEducation currentCity city state currentState motherTongue
        gender profileImage updatedAt createdAt designation
      `)
      .sort({ createdAt: -1 })
      .lean();

    // Age calculation helper
    const calculateAge = (dob) => {
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    const formattedLikes = likes
      .filter((like) => like.senderId) // Exclude null senderId
      .map((like) => {
        const user = like.senderId;

        return {
          vmId: user.vmId,
          _id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          age: calculateAge(user.dateOfBirth),
          height: user.height,
          caste: user.caste,
          designation: user.designation,
          religion: user.religion,
          profession: user.occupation,
          salary: user.annualIncome,
          education: user.highestEducation,
          location: `${user.city || user.currentCity || ''}, ${user.state || user.currentState || ''}`,
          languages: Array.isArray(user.motherTongue)
            ? user.motherTongue.join(', ')
            : user.motherTongue,
          gender: user.gender,
          profileImage: user.profileImage,
          lastSeen: user.updatedAt || user.createdAt,
        };
      });


    res.status(200).json({ success: true, like: formattedLikes });
  } catch (error) {
    console.error('Error getting received likes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// In this controller we can see which users have written our profile.
export const getAllUsersILiked = async (req, res) => {
  try {
    const userId = req.user.userId;

    const likes = await LikeModel.find({ senderId: userId })
      .populate({
        path: 'receiverId',
        select: `firstName lastName userName dateOfBirth height religion occupation 
        annualIncome highestEducation city state motherTongue 
        gender updatedAt createdAt`
      });

    const profiles = likes.map(like => {
      const user = like.receiverId;

      return {
        name: `${user.firstName} ${user.lastName}`,
        age: calculateAge(user.dateOfBirth),
        height: user.height,
        religion: user.religion,
        profession: user.occupation,
        salary: user.annualIncome,
        education: user.highestEducation,
        location: `${user.city}, ${user.state}`,
        languages: user.motherTongue,
        gender: user.gender,
        lastSeen: user.updatedAt || user.createdAt,
        likeStatus: like.status,
      };
    });

    res.status(200).json({
      success: true,
      likedUsers: profiles,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// In this controller we can get only matches user data
export const getMatchedUsers = async (req, res) => {
  try {
    const userId = req.user.userId;

    const matches = await LikeModel.find({
      status: 'matched',
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).lean();

    const oppositeUserIds = matches.map((match) => {
      if (match.senderId.toString() === userId) {
        return match.receiverId;
      } else {
        return match.senderId;
      }
    });

    const uniqueUserIds = [...new Set(oppositeUserIds.map(String))];


    const matchedUsers = await RegisterModel.find({
      _id: { $in: uniqueUserIds },
      adminApprovel: 'approved'
    }).select(`
      _id vmId firstName lastName dateOfBirth height religion caste occupation
      annualIncome highestEducation currentCity city state currentState motherTongue
      gender profileImage updatedAt createdAt designation
    `);

    // Age calculation
    const calculateAge = (dob) => {
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    // Format result
    const formatted = matchedUsers.map((user) => ({
      _id: user._id,
      vmId: user.vmId,
      name: `${user.firstName} ${user.lastName}`,
      age: calculateAge(user.dateOfBirth),
      height: user.height,
      caste: user.caste,
      designation: user.designation,
      religion: user.religion,
      profession: user.occupation,
      salary: user.annualIncome,
      education: user.highestEducation,
      location: `${user.city || user.currentCity || ''}, ${user.state || user.currentState || ''}`,
      languages: Array.isArray(user.motherTongue)
        ? user.motherTongue.join(', ')
        : user.motherTongue,
      gender: user.gender,
      profileImage: user.profileImage,
      lastSeen: user.updatedAt || user.createdAt,
    }));

    res.status(200).json({ success: true, allMatches: formatted });
  } catch (error) {
    console.error('Error getting matched users:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTheyShortlisted = async (req, res) => {
  const myUserId = req.user.userId;

  try {
    const likes = await LikeModel.find({ receiverId: myUserId })
      .populate('senderId', `
        _id vmId firstName lastName dateOfBirth height religion caste occupation
        annualIncome highestEducation currentCity city state currentState motherTongue
        gender profileImage updatedAt createdAt designation
      `)
      .sort({ createdAt: -1 });

    const data = likes.map(like => {
      const user = like.senderId;
      return {
        _id: user._id,
        vmId: user.vmId,
        name: `${user.firstName} ${user.lastName}`,
        age: calculateAge(user.dateOfBirth),
        height: user.height,
        caste: user.caste,
        designation: user.designation,
        religion: user.religion,
        salary: user.annualIncome,
        education: user.highestEducation,
        location: `${user.city || user.currentCity || ''}, ${user.state || user.currentState || ''}`,
        languages: user.motherTongue,
        gender: user.gender,
        profileImage: user.profileImage,
        lastSeen: user.updatedAt,
        viewedAt: like.createdAt,
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching shortlist data', error });
  }
};

export const getIShortlisted = async (req, res) => {
  const myUserId = req.user.userId;

  try {
    const likes = await LikeModel.find({ senderId: myUserId })
      .populate('receiverId', `
        _id vmId firstName lastName dateOfBirth height religion caste occupation
        annualIncome highestEducation currentCity city state currentState motherTongue
        gender profileImage updatedAt createdAt designation
      `)
      .sort({ createdAt: -1 });

    const data = likes
      .filter(like => like.receiverId)
      .map(like => {
        const user = like.receiverId;

        return {
          _id: user._id,
          vmId: user.vmId,
          name: `${user.firstName} ${user.lastName}`,
          age: calculateAge(user.dateOfBirth),
          height: user.height,
          caste: user.caste,
          designation: user.designation,
          religion: user.religion,
          salary: user.annualIncome,
          education: user.highestEducation,
          location: `${user.city || user.currentCity || ''}, ${user.state || user.currentState || ''}`,
          languages: user.motherTongue,
          gender: user.gender,
          profileImage: user.profileImage,
          lastSeen: user.updatedAt,
          viewedAt: like.createdAt,
        };
      });

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching I shortlisted data:', error);
    res.status(500).json({ success: false, message: 'Error fetching shortlist data', error });
  }
};

export const unlikeUser = async (req, res) => {
  const senderId = req.user.userId;
  const { receiverId } = req.body;

  if (!senderId || !receiverId || senderId === receiverId) {
    return res.status(400).json({
      success: false,
      message: 'Invalid unlike request'
    });
  }

  try {

    // 🔹 Step 1: check if already liked
    const existingLike = await LikeModel.findOne({
      senderId,
      receiverId
    });

    if (existingLike) {
      return res.status(400).json({
        success: false,
        message: 'Already unliked'
      });
    }

    // 🔹 Step 2: create like
    const newLike = await LikeModel.create({
      senderId,
      receiverId,
      status: "unlike"
    });

    return res.status(201).json({
      success: true,
      message: 'Added in not-now ❤️',
      data: newLike
    });

  } catch (error) {

    console.error("not now Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

export const getUnlikedProfiles = async (req, res) => {
  try {

    const userId = req.user.userId;

    // 🔹 Step 1: get ONLY unlike data
    const unlikes = await LikeModel.find({
      senderId: userId,
      status: "unlike" // 🔥 important
    })
      .populate({
        path: 'receiverId',
        select: `
          _id vmId firstName lastName dateOfBirth height religion caste designation
          annualIncome highestEducation city state currentCity currentState motherTongue
          gender profileImage updatedAt createdAt
        `
      })
      .sort({ createdAt: -1 })
      .lean();

    // 🔹 Step 2: age function
    const calculateAge = (dob) => {
      if (!dob) return null;
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    // 🔹 Step 3: format data
    const data = unlikes
      .filter(like => like.receiverId) // null safety
      .map((like) => {
        const user = like.receiverId;

        return {
          unlikeId: like._id,

          _id: user._id,
          vmId: user.vmId,
          name: `${user.firstName || ''} ${user.lastName || ''}`,
          age: calculateAge(user.dateOfBirth),

          height: user.height || '',
          caste: user.caste || '',
          designation: user.designation || '',
          religion: user.religion || '',
          profession: user.designation || '',
          salary: user.annualIncome || '',
          education: user.highestEducation || '',

          location: `${user.city || user.currentCity || ''}, ${user.state || user.currentState || ''}`,

          languages: Array.isArray(user.motherTongue)
            ? user.motherTongue.join(', ')
            : (user.motherTongue || ''),

          gender: user.gender || '',
          profileImage: user.profileImage || '',

          lastSeen: user.updatedAt || user.createdAt,
        };
      });

    return res.status(200).json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {

    console.error("Error getting unliked profiles:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

export const gettheCountofLikeAndUnlike = async (req, res) => {
  try {

    const userId = req.user.userId;

    // 🔹 Step 1: get all likes of sender
    const likes = await LikeModel.find({
      senderId: userId
    }).select("status");

    // 🔹 Step 2: count
    let likedCount = 0;
    let unlikeCount = 0;

    likes.forEach(item => {
      if (item.status === "liked") likedCount++;
      if (item.status === "unlike") unlikeCount++;
    });

    return res.status(200).json({
      success: true,
      data: {
        liked: likedCount,
        unlike: unlikeCount,
        total: likes.length
      }
    });

  } catch (error) {

    console.error("Count Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

export const restoreUnlikedProfilfromSender = async (req, res) => {
  try {

    const senderId = req.user.userId;
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: "ReceiverId is required"
      });
    }

    // 🔹 Step 1: find unlike (ONLY sender side)
    const unlikeData = await LikeModel.findOne({
      senderId,
      receiverId,
      status: "unlike"
    });

    if (!unlikeData) {
      return res.status(404).json({
        success: false,
        message: "Unliked profile not found"
      });
    }

    // 🔥 Step 2: delete (restore)
    await LikeModel.deleteOne({
      _id: unlikeData._id
    });

    return res.status(200).json({
      success: true,
      message: "Profile restored successfully 💙"
    });

  } catch (error) {

    console.error("Restore Unlike Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};


