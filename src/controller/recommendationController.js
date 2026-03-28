import RegisterModel from '../modal/register.js';
import { AccountRequestModel } from '../modal/accountRequestModel.js';
import { BlockModel } from '../modal/blockModel.js';
import { LikeModel } from '../modal/likeRequestModal.js';

export const getDailyRecomadation = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Step 1: Blocked users
    const blockedUsers = await BlockModel.find({ blockedBy: userId }).select('blockedUser');
    const blockedUserIds = blockedUsers.map(block => block.blockedUser.toString());

    // Step 2: Users liked or matched by this user
    const likedUsers = await LikeModel.find({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    }).select('senderId receiverId');

    const likedUserIds = new Set();
    likedUsers.forEach(like => {
      if (like.senderId.toString() !== userId) likedUserIds.add(like.senderId.toString());
      if (like.receiverId.toString() !== userId) likedUserIds.add(like.receiverId.toString());
    });

    // Step 3: Users this user sent account requests to
    const sentRequests = await AccountRequestModel.find({ sender: userId }).select('receiverId');
    const requestedUserIds = sentRequests.map(req => req.receiverId.toString());

    const excludedUserIds = new Set([
      ...blockedUserIds,
      ...Array.from(likedUserIds),
      ...requestedUserIds,
      userId.toString() // Exclude self
    ]);

    // Step 5: Fetch users excluding blocked, liked, requested, and self
    const allUsers = await RegisterModel.find({
      _id: { $nin: Array.from(excludedUserIds) }
    }).select(`
       _id vmId firstName lastName dateOfBirth height religion caste occupation
      annualIncome highestEducation currentCity city state currentState motherTongue
      gender profileImage updatedAt createdAt designation
    `);

    // Step 6: Age utility
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

    // Step 7: Format profiles
    const profiles = allUsers.map(user => ({
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
      location: `${user.city || ''}, ${user.state || ''}`,
      languages: Array.isArray(user.motherTongue)
        ? user.motherTongue.join(', ')
        : user.motherTongue,
      gender: user.gender,
      profileImage: user.profileImage,
      lastSeen: user.updatedAt || user.createdAt,
    }));

    res.status(200).json({ success: true, profiles });

  } catch (error) {
    console.error('Error fetching daily recommendations:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const blockUserRecomadationUserNotShow = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Step 1: Get the list of users this user has blocked
    const blockedUsers = await BlockModel.find({ blockedBy: userId }).select('blockedUser');
    const blockedUserIds = blockedUsers.map(block => block.blockedUser.toString());

    // Step 2: Fetch all users excluding blocked ones
    const allUsers = await RegisterModel.find({
      _id: { $nin: blockedUserIds, $ne: userId } // Exclude blocked users and self
    }).select(`
      vmId firstName lastName dateOfBirth height religion caste occupation
      annualIncome highestEducation currentCity city state currentState motherTongue
      gender profileImage updatedAt createdAt designation
    `);

    // Step 3: Utility to calculate age
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

    // Step 4: Format response
    const profiles = allUsers.map(user => ({
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
      location: `${user.city || ''}, ${user.state || ''}`,
      languages: Array.isArray(user.motherTongue)
        ? user.motherTongue.join(', ')
        : user.motherTongue,
      gender: user.gender,
      profileImage: user.profileImage,
      lastSeen: user.updatedAt || user.createdAt,
    }));

    res.status(200).json({ success: true, profiles });

  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};






