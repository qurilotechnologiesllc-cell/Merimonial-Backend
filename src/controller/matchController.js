import RegisterModel from "../modal/register.js"
import { AccountRequestModel } from "../modal/accountRequestModel.js";
import { LikeModel } from "../modal/likeRequestModal.js";

export const getAllMatches = async (req, res) => {
  try {

    const userId = req.user.userId;

    // 🔹 Step 1: get logged user
    const loggedUser = await RegisterModel.findById(userId).select("gender");

    if (!loggedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // 🔥 Step 2: opposite gender
    let oppositeGender = loggedUser.gender === "Male" ? "Female" : "Male";

    // 🔹 Step 3: ALL request related users (both side)
    const allRequests = await AccountRequestModel.find({
      $or: [
        { sender: userId },
        { receiverId: userId }
      ]
    });

    const requestBlockedIds = allRequests.map(req => {
      return req.sender.toString() === userId.toString()
        ? req.receiverId.toString()
        : req.sender.toString();
    });
    

    // 🔥 Step 4: ONLY sender likes (important 💙)
    const likedUsers = await LikeModel.find({
      senderId: userId // 👈 only sender
    }).select("receiverId");

    const likedUserIds = likedUsers.map(like => like.receiverId.toString());

    // 🔥 Step 5: merge
    const blockedUserIds = [...new Set([
      ...requestBlockedIds,
      ...likedUserIds
    ])];


    // 🔹 Step 6: fetch users
    const users = await RegisterModel.find({
      _id: { $ne: userId, $nin: blockedUserIds },
      gender: oppositeGender,
    })
      .sort({ createdAt: -1 })
      .lean();

      

    // 🔹 Step 7: format
    const data = users.map(user => ({
      _id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      age: user.dateOfBirth
        ? new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear()
        : null,
      height: user.height,
      caste: user.caste,
      religion: user.religion,
      education: user.highestEducation,
      profession: user.designation,
      location: `${user.city || ""}, ${user.state || ""}`,
      profileImage: user.profileImage,
      income: user.annualIncome
    }));

    return res.status(200).json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {

    console.error("Get All Matches Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

export const getmatchesWithProfile = async (req, res) => {
  try {

    const userId = req.user.userId;

    // 🔹 Step 1: get logged user
    const loggedUser = await RegisterModel.findById(userId).select("gender");

    if (!loggedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // 🔥 Step 2: opposite gender
    let oppositeGender = loggedUser.gender === "Male" ? "Female" : "Male";

    // 🔹 Step 3: get ALL request related users
    const allRequests = await AccountRequestModel.find({
      $or: [
        { sender: userId },
        { receiverId: userId }
      ]
    });

    const requestBlockedIds = allRequests.map(req => {
      return req.sender.toString() === userId.toString()
        ? req.receiverId.toString()
        : req.sender.toString();
    });

    // 🔥 Step 4: get liked users (ONLY sender side)
    const likedUsers = await LikeModel.find({
      senderId: userId
    }).select("receiverId");

    const likedUserIds = likedUsers.map(like => like.receiverId.toString());

    // 🔥 Step 5: merge blocked users
    const blockedUserIds = [...new Set([
      ...requestBlockedIds,
      ...likedUserIds
    ])];

    // 🔹 Step 6: get profiles
    const users = await RegisterModel.find({
      _id: { $ne: userId, $nin: blockedUserIds },
      gender: oppositeGender,
      profileImage: { $exists: true, $ne: "" }
    })
      .select(`
        firstName lastName dateOfBirth height religion caste designation
        annualIncome highestEducation city state motherTongue
        gender profileImage updatedAt createdAt
      `)
      .sort({ createdAt: -1 })
      .lean();

    // 🔹 Step 7: format response
    const data = users.map(user => ({
      _id: user._id,
      name: `${user.firstName || ''} ${user.lastName || ''}`,
      age: user.dateOfBirth
        ? new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear()
        : null,
      height: user.height || '',
      caste: user.caste || '',
      designation: user.designation || '',
      religion: user.religion || '',
      salary: user.annualIncome || '',
      education: user.highestEducation || '',
      location: `${user.city || ''}, ${user.state || ''}`,
      languages: Array.isArray(user.motherTongue)
        ? user.motherTongue.join(', ')
        : (user.motherTongue || ''),
      gender: user.gender || '',
      profileImage: user.profileImage || '',
      lastSeen: user.updatedAt || user.createdAt,
    }));

    return res.status(200).json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {

    console.error("Error in getmatchesWithProfile:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

export const preferencesProfile = async (req, res) => {
  try {

    const userId = req.user.userId;

    // 🔹 Step 1: get logged user
    const myProfile = await RegisterModel.findById(userId);

    if (!myProfile) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // 🔥 Step 2: opposite gender
    let oppositeGender = myProfile.gender === "Male" ? "Female" : "Male";

    // 🔹 Step 3: get ALL related requests
    const allRequests = await AccountRequestModel.find({
      $or: [
        { sender: userId },
        { receiverId: userId }
      ]
    });

    // 🔥 Step 4: extract all blocked users
    const blockedUserIds = allRequests.map(req => {
      if (req.sender.toString() === userId.toString()) {
        return req.receiverId.toString();
      } else {
        return req.sender.toString();
      }
    });

    // 🔹 Step 5: get candidates
    const candidates = await RegisterModel.find({
      _id: { $ne: userId, $nin: blockedUserIds },
      gender: oppositeGender,
      profileImage: { $exists: true, $ne: "" }
    }).lean();

    // 🔥 Step 6: matching logic
    const result = candidates.map(user => {

      let score = 0;
      let total = 4;

      if (myProfile.caste && user.caste === myProfile.caste) score++;
      if (myProfile.city && user.city === myProfile.city) score++;
      if (myProfile.community && user.community === myProfile.community) score++;
      if (myProfile.gotra && user.gotra === myProfile.gotra) score++;

      const matchPercentage = (score / total) * 100;

      return {
        _id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        profileImage: user.profileImage,
        location: `${user.city || ""}, ${user.state || ""}`,
        caste: user.caste,
        community: user.community,
        gotra: user.gotra,
        matchPercentage
      };
    });

    // 🔥 Step 7: filter 75%+
    const filtered = result.filter(p => p.matchPercentage >= 75);

    // 🔥 Step 8: sort
    filtered.sort((a, b) => b.matchPercentage - a.matchPercentage);

    return res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered
    });

  } catch (error) {

    console.error("Preference Match Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

export const getMutualMatchesProfile = async (req, res) => {
  try {

    const userId = req.user.userId;

    // 🔹 Step 1: my direct connections
    const myConnections = await AccountRequestModel.find({
      status: "accepted",
      $or: [
        { sender: userId },
        { receiverId: userId }
      ]
    });

    const connectionIds = myConnections.map(req => {
      return req.sender.toString() === userId.toString()
        ? req.receiverId.toString()
        : req.sender.toString();
    });

    // 🔥 Step 2: find second level (B ↔ C BOTH SIDES)
    const secondLevel = await AccountRequestModel.find({
      status: "accepted",
      $or: [
        { sender: { $in: connectionIds } },
        { receiverId: { $in: connectionIds } }
      ]
    })
      .populate("sender", `
        firstName lastName dateOfBirth height religion caste designation
        annualIncome highestEducation city state motherTongue
        gender profileImage updatedAt createdAt
      `)
      .populate("receiverId", `
        firstName lastName dateOfBirth height religion caste designation
        annualIncome highestEducation city state motherTongue
        gender profileImage updatedAt createdAt
      `)
      .lean();

    const seen = new Set();

    const data = secondLevel
      .map(req => {
        // 🔥 identify "other user"
        if (connectionIds.includes(req.sender?._id?.toString())) {
          return req.receiverId;
        } else {
          return req.sender;
        }
      })
      .filter(user => {
        if (!user) return false;

        const id = user._id.toString();

        if (id === userId.toString()) return false; // ❌ self
        if (connectionIds.includes(id)) return false; // ❌ direct
        if (seen.has(id)) return false; // ❌ duplicate

        seen.add(id);
        return true;
      })
      .map(user => ({
        _id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        age: user.dateOfBirth
          ? new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear()
          : null,
        height: user.height,
        caste: user.caste,
        religion: user.religion,
        designation: user.designation,
        location: `${user.city || ""}, ${user.state || ""}`,
        profileImage: user.profileImage
      }));

    return res.status(200).json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {

    console.error("Second Level Match Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};


