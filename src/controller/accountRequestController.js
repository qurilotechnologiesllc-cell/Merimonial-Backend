import { AccountRequestModel } from "../modal/accountRequestModel.js";
import RegisterModel from "../modal/register.js"
import { LikeModel } from "../modal/likeRequestModal.js";

export const calculateAge = dob => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const sendRequest = async (req, res) => {
  try {

    const senderId = req.user.userId;
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: "ReceiverId is required"
      });
    }

    // ❌ self request block
    if (senderId === receiverId) {
      return res.status(400).json({
        success: false,
        message: "You cannot send request to yourself"
      });
    }

    // 🔹 check receiver exists
    const receiver = await RegisterModel.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found"
      });
    }

    // 🔥 prevent duplicate request
    const alreadySent = await AccountRequestModel.findOne({
      sender: senderId,
      receiverId: receiverId
    });

    if (alreadySent) {
      return res.status(400).json({
        success: false,
        message: "Request already sent"
      });
    }

    // 🔥 Step 1: create request
    const request = await AccountRequestModel.create({
      sender: senderId,
      receiverId: receiverId,
      status: "pending"
    });

    // 🔥 Step 2: delete like (if exists)
    await LikeModel.findOneAndDelete({
      senderId: senderId,
      receiverId: receiverId
    });

    return res.status(201).json({
      success: true,
      message: "Request sent successfully",
      data: request
    });

  } catch (error) {

    console.error("Send Request Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

export const getSentRequests = async (req, res) => {
  const userId = req.user.userId;

  try {

    const requests = await AccountRequestModel.find({ sender: userId })
      .populate({
        path: 'receiverId', // 🔥 direct user
        select: `
          firstName lastName dateOfBirth height religion caste designation
          annualIncome highestEducation city state motherTongue
          gender profileImage updatedAt createdAt
        `
      })
      .sort({ createdAt: -1 })
      .lean();

    const data = requests
      .filter(req => req.receiverId) // null safety
      .map(req => {
        const user = req.receiverId;

        return {
          requestId: req._id, // 🔥 request id
          _id: user._id,
          name: `${user.firstName || ''} ${user.lastName || ''}`,
          age: user.dateOfBirth ? calculateAge(user.dateOfBirth) : null,
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
        };
      });

    return res.status(200).json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {

    console.error("Error in getSentRequests:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getReceivedRequests = async (req, res) => {
  const userId = req.user.userId;

  try {

    const requests = await AccountRequestModel.find({
      receiverId: userId,     // 🔥 only my requests
      status: "pending"
    })
      .populate({
        path: 'sender', // 🔥 jisne request bheji
        select: `
          firstName lastName dateOfBirth height religion caste designation
          annualIncome highestEducation city state motherTongue
          gender profileImage updatedAt createdAt
        `
      })
      .sort({ createdAt: -1 })
      .lean();

    const data = requests
      .filter(req => req.sender)
      .map(req => {
        const user = req.sender;

        return {
          requestId: req._id,
          userId: user._id,
          name: `${user.firstName || ''} ${user.lastName || ''}`,
          age: user.dateOfBirth ? calculateAge(user.dateOfBirth) : null,
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
        };
      });

      console.log(data);
      

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {

    console.error("Error in getReceivedRequests:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

export const updateAccountRequestStatus = async (req, res) => {
  const userId = req.user.userId;
  const { requestId, status } = req.body;

  // 🔥 validate status
  if (!['accepted', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status'
    });
  }

  try {

    // 🔹 Step 1: find request
    const request = await AccountRequestModel.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // 🔥 Step 2: only receiver can update
    if (request.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Only receiver can update this request'
      });
    }

    // 🔹 Step 4: update status
    request.status = status;
    await request.save();

    return res.status(200).json({
      success: true,
      message: `Request ${status}`,
      data: request
    });

  } catch (error) {

    console.error("Update Request Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

export const getAcceptedRequests = async (req, res) => {
  const userId = req.user.userId;

  try {

    const requests = await AccountRequestModel.find({
      receiverId: userId,   // 🔥 only receiver
      status: "accepted"
    })
      .populate({
        path: 'sender', // 🔥 jisne request bheji
        select: `
          _id vmId firstName lastName dateOfBirth height religion caste designation
          annualIncome highestEducation city state motherTongue
          gender profileImage updatedAt createdAt
        `
      })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = requests
      .filter(req => req.sender)
      .map((req) => ({
        requestId: req._id,
        status: req.status,
        createdAt: req.createdAt,
        user: req.sender, // 🔥 sender profile
        acceptedBy: 'me'
      }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      requests: formatted
    });

  } catch (error) {

    console.error('Error fetching accepted requests:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });

  }
};

export const getRejectedRequests = async (req, res) => {
  const userId = req.user.userId;

  try {

    const requests = await AccountRequestModel.find({
      receiverId: userId,   // 🔥 only receiver
      status: "rejected"
    })
      .populate({
        path: 'sender', // 🔥 jisne request bheji
        select: `
          _id vmId firstName lastName dateOfBirth height religion caste designation
          annualIncome highestEducation city state motherTongue
          gender profileImage updatedAt createdAt
        `
      })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = requests
      .filter(req => req.sender)
      .map((req) => ({
        requestId: req._id,
        status: req.status,
        createdAt: req.createdAt,
        user: req.sender
      }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      requests: formatted
    });

  } catch (error) {

    console.error('Error fetching rejected requests:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });

  }
};

export const deleteAccountRequest = async (req, res) => {
  try {

    const userId = req.user.userId;
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "RequestId is required"
      });
    }

    // 🔹 Step 1: find request
    const request = await AccountRequestModel.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found"
      });
    }

    // 🔥 Step 2: only sender can delete
    if (request.sender.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only sender can delete this request"
      });
    }

    // 🔥 Step 3: optional rule (pro 😏)
    if (request.status === "accepted") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete accepted request"
      });
    }

    // 🔹 Step 4: delete request
    await AccountRequestModel.findByIdAndDelete(requestId);

    return res.status(200).json({
      success: true,
      message: "Request deleted successfully"
    });

  } catch (error) {

    console.error("Delete Request Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

export const restoreMatches = async (req, res) => {
  try {

    const { requestId } = req.body;
    const userId = req.user.userId;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "RequestId is required"
      });
    }

    // 🔹 Step 1: find request
    const request = await AccountRequestModel.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found"
      });
    }

    const isSender = request.sender.toString() === userId.toString();
    const isReceiver = request.receiverId.toString() === userId.toString();

    if (!isSender && !isReceiver) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access"
      });
    }

    // 🔥 Step 3: only rejected can be restored
    if (request.status !== "rejected") {
      return res.status(400).json({
        success: false,
        message: "Only rejected requests can be restored"
      });
    }

    // 🔹 Step 4: update status
    request.status = "pending";
    await request.save();

    return res.status(200).json({
      success: true,
      message: "Request restored successfully",
      data: request
    });

  } catch (error) {

    console.error("Restore Request Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

export const getReceivedRequestsByStatus = async (req, res) => {
  const userId = req.userId;
  const { status } = req.query;

  const validStatuses = ['pending', 'accepted', 'rejected'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status filter' });
  }

  try {
    const filter = { receiverId: userId };
    if (status) {
      filter.status = status;
    }

    const requests = await AccountRequestModel.find(filter)
      .populate({
        path: 'requesterId',
        select: `
          firstName lastName phoneNumber profileImage 
          partnerPreference.setAssProfileImage height caste designation 
          annualIncome currentCity motherTongue highestEducation dateOfBirth id
        `
      })
      .sort({ createdAt: -1 });

    // Format response
    const formatted = requests.map((request) => {
      const user = request.requesterId;
      return {
        requestId: request._id,
        status: request.status,
        createdAt: request.createdAt,
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          id: user.id,
          height: user.height,
          caste: user.caste,
          designation: user.designation,
          annualIncome: user.annualIncome,
          currentCity: user.currentCity,
          motherTongue: user.motherTongue,
          highestEducation: user.highestEducation,
          profileImage: user.profileImage || user?.partnerPreference?.setAssProfileImage || null,
          dateOfBirth: user.dateOfBirth,
        }
      };
    });

    res.status(200).json({ success: true, requests: formatted });
  } catch (error) {
    console.error('Error in getReceivedRequestsByStatus:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getRequestsAcceptedByOthers = async (req, res) => {
  const userId = req.userId;

  try {
    const requests = await AccountRequestModel.find({
      requesterId: userId,
      status: 'accepted',
    }).populate({
      path: 'receiverId',
      select: `
        id _id firstName lastName dateOfBirth height religion caste occupation
        annualIncome highestEducation currentCity city state currentState motherTongue
        gender profileImage updatedAt createdAt designation
      `,
    }).sort({ createdAt: -1 });

    const formatted = requests.map((request) => ({
      requestId: request._id,
      status: request.status,
      createdAt: request.createdAt,
      user: request.receiverId,
      acceptedBy: 'other'
    }));

    res.status(200).json({ success: true, requests: formatted });
  } catch (error) {
    console.error('Error fetching accepted requests by others:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

