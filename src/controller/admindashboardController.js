import mongoose from 'mongoose';
import moment from 'moment';
import RegisterModel from '../modal/register.js';
import ReportModel from '../modal/ReportModel.js';
import Notification from '../modal/Notification.js';
import { AccountRequestModel } from "../modal/accountRequestModel.js";

const safe = (n) => (n === 0 ? 0 : n);

const percentageChange = (current, previous) => {
  if (previous === 0) return 100;
  return +(((current - previous) / previous) * 100).toFixed(1);
};

const direction = (change) => (change >= 0 ? "up" : "down");

// TRUE PERCENT FUNCTION

// AB — null ki jagah 0 return karega
const percent = (current, previous) => {
  if (previous === 0) return 0; // ✅ null hata diya
  return Number((((current - previous) / previous) * 100).toFixed(1));
};


export const getStatsSummary = async (req, res) => {

  try {
    const now = moment().tz("Asia/Kolkata");

    // TODAY / YESTERDAY
    const todayStart = now.clone().startOf("day");
    const tomorrowStart = todayStart.clone().add(1, "day");

    const yesterdayStart = todayStart.clone().subtract(1, "day");
    const yesterdayEnd = todayStart.clone();

    // THIS WEEK (Mon-Sun)
    const thisWeekStart = now.clone().startOf("isoWeek");
    const nextWeekStart = thisWeekStart.clone().add(1, "week");

    // LAST WEEK (Mon-Sun)
    const lastWeekStart = thisWeekStart.clone().subtract(1, "week");
    const lastWeekEnd = thisWeekStart.clone();


    // ============ DATABASE QUERIES =============
    const [
      totalUsers,

      // Signup Today / Yesterday
      newSignupsToday,
      newSignupsYesterday,

      // Approved this week
      approvedThisWeek,
      approvedLastWeek,

      // Pending counts
      pendingTotal,
      pendingThisWeek,
      pendingLastWeek,

      // Active users
      activeUsers,
      activeUsersLastWeek,


      // Reports
      pendingReports,
      blockedReports
    ] = await Promise.all([

      RegisterModel.countDocuments(),

      RegisterModel.countDocuments({
        createdAt: { $gte: todayStart.toDate(), $lt: tomorrowStart.toDate() }
      }),

      RegisterModel.countDocuments({
        createdAt: { $gte: yesterdayStart.toDate(), $lt: yesterdayEnd.toDate() }
      }),

      // APPROVED THIS WEEK
      RegisterModel.countDocuments({
        adminApprovel: "approved",
        createdAt: { $gte: thisWeekStart.toDate(), $lt: nextWeekStart.toDate() }
      }),

      // APPROVED LAST WEEK
      RegisterModel.countDocuments({
        adminApprovel: "approved",
        createdAt: { $gte: lastWeekStart.toDate(), $lt: lastWeekEnd.toDate() }
      }),

      // ALL pending
      RegisterModel.countDocuments({ adminApprovel: "pending" }),

      // Pending THIS WEEK
      RegisterModel.countDocuments({
        adminApprovel: "pending",
        createdAt: { $gte: thisWeekStart.toDate(), $lt: nextWeekStart.toDate() }
      }),

      // Pending LAST WEEK
      RegisterModel.countDocuments({
        adminApprovel: "pending",
        createdAt: { $gte: lastWeekStart.toDate(), $lt: lastWeekEnd.toDate() }
      }),

      // ACTIVE
      RegisterModel.countDocuments({
        lastLoginAt: {
          $gte: moment().subtract(24, "hours").toDate()
        }
      }),

      RegisterModel.countDocuments({
        lastLoginAt: {
          $gte: now.clone().subtract(8, "days").toDate(),
          $lt: now.clone().subtract(7, "days").toDate()
        }
      }),

      // Reports
      ReportModel.countDocuments({
        status: { $in: ["approved", "pending"] }
      }),

      // BLOCKED USER
      RegisterModel.countDocuments({
        blockedUsers: { $exists: true, $ne: [] }
      }),
    ]);

    // ============ RESPONSE =============
    res.status(200).json({
      totalUsers: safe(totalUsers),

      newSignups: safe(newSignupsToday),
      signupChangePercent: percent(newSignupsToday, newSignupsYesterday),

      // FINAL VERIFIED = This Week Approved
      verifiedProfiles: safe(approvedThisWeek),
      verifiedChangePercent: percent(approvedThisWeek, approvedLastWeek),

      pendingVerifications: safe(pendingTotal),
      pendingChangePercent: percent(pendingThisWeek, pendingLastWeek),

      activeUsers: safe(activeUsers),
      activeUsersChangePercent: percent(activeUsers, activeUsersLastWeek),

      reportedPercent: Math.max(1, Number(((pendingReports / totalUsers) * 100).toFixed(1))),
      blockedPercent: Math.max(1, Number(((blockedReports / totalUsers) * 100).toFixed(1))),
    });

  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};


export const getSignupGender = async (req, res) => {
  try {
    const allUsers = await RegisterModel.find({});

    // =========================
    // 🔹 BASIC COUNTS
    // =========================
    const genderCounts = { Male: 0, Female: 0, Others: 0 };

    const matchStats = {
      stillLooking: 0,
      matched: 0,
      newlyRegistered: 0,
      inactive: 0,
    };

    const today = new Date();
    const currentMonth = moment().month();
    const currentYear = moment().year();

    const currentMonthName = moment().format("MMM").toLowerCase();
    const prevMonthName = moment().subtract(1, "month").format("MMM").toLowerCase();

    const signInDataMap = new Map();

    const daysInCurrentMonth = moment().daysInMonth();

    // =========================
    // 🔹 INIT DAYS
    // =========================
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const dayKey = String(i).padStart(2, "0");

      signInDataMap.set(dayKey, {
        day: dayKey,
        [currentMonthName]: 0,
        [prevMonthName]: 0,
      });
    }

    // =========================
    // 🔹 LOOP USERS
    // =========================
    allUsers.forEach((user) => {
      // -------------------------
      // 🔸 GENDER COUNT
      // -------------------------
      if (user.gender in genderCounts) {
        genderCounts[user.gender]++;
      } else {
        genderCounts.Others++;
      }

      // -------------------------
      // 🔸 MATCH STATS
      // -------------------------
      const createdAt = new Date(user.createdAt);

      if (user.adminApprovel === "approved") {
        matchStats.matched++;
      } else if (!user.isMobileVerified) {
        matchStats.inactive++;
      } else {
        const diffDays = Math.ceil(
          Math.abs(today - createdAt) / (1000 * 60 * 60 * 24)
        );

        if (diffDays <= 7) {
          matchStats.newlyRegistered++;
        } else {
          matchStats.stillLooking++;
        }
      }

      // =========================
      // 🔥 SIGN-IN DATA (FIXED)
      // =========================
      if (!user.lastLoginAt) return;

      const loginDate = moment(user.lastLoginAt);

      const userMonth = loginDate.month();
      const userYear = loginDate.year();
      const userDay = loginDate.format("DD");

      if (userYear === currentYear) {
        // Current Month
        if (userMonth === currentMonth) {
          if (signInDataMap.has(userDay)) {
            signInDataMap.get(userDay)[currentMonthName]++;
          }
        }

        // Previous Month
        else if (
          userMonth === currentMonth - 1 ||
          (currentMonth === 0 && userMonth === 11)
        ) {
          if (signInDataMap.has(userDay)) {
            signInDataMap.get(userDay)[prevMonthName]++;
          }
        }
      }
    });

    // =========================
    // 🔹 FINAL FORMAT
    // =========================
    const signInData = Array.from(signInDataMap.values()).sort(
      (a, b) => parseInt(a.day) - parseInt(b.day)
    );

    // =========================
    // 🔹 RESPONSE
    // =========================
    res.json({
      signInData,

      genderData: [
        { name: "Male", value: genderCounts.Male },
        { name: "Female", value: genderCounts.Female },
      ],

      matchData: [
        { name: "Still Looking", value: matchStats.stillLooking },
        { name: "Successfully Matched", value: matchStats.matched },
        { name: "Newly Registered", value: matchStats.newlyRegistered },
        { name: "Inactive", value: matchStats.inactive },
      ],

      totalCurrentMonthSignIns: signInData.reduce(
        (sum, d) => sum + d[currentMonthName],
        0
      ),
    });

  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({
      error: "Failed to fetch analytics data",
    });
  }
};


export const getUsers = async (req, res) => {
  try {
    const { search = '', status, gender, page = 1, limit = 5 } = req.query;

    const query = {};

    if (search) {
      // Try to search by full _id if it's a valid ObjectId, otherwise search by name fields
      if (mongoose.Types.ObjectId.isValid(search)) {
        query._id = new mongoose.Types.ObjectId(String(search)); // safe
      }

      else {
        // If it's not a valid ObjectId, search across name fields
        query.$or = [
          { id: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
          { middleName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
        ];
      }
    }

    if (status) {
      query.adminApprovel = status;
    }

    if (gender) {
      query.gender = gender;
    }

    const total = await RegisterModel.countDocuments(query);

    const users = await RegisterModel.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });


    const formattedUsers = users.map((user) => ({
      // Consider if slicing _id is really what you want for display.
      // A full ID or a proper sequential user ID might be better.
      id: `#${user.vmId}`,
      name: `${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''}`.trim(),
      location: user.currentCity || user.city || 'N/A',
      gender: user.gender || 'N/A',
      joined: moment(user.createdAt).format('DD MMM, YYYY'),
      verified: user.adminApprovel === "approved" ? "Yes" : "No",
      verifiedIcon: user.adminApprovel === "approved" ? "green" : "red",
      status: user.adminApprovel || 'pending',
      lastActive: moment(user.updatedAt).format('DD MMM, YYYY'),

    }));

    res.status(200).json({
      data: formattedUsers,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const getUserManage = async (req, res) => {
  try {
    const now = moment().tz("Asia/Kolkata");

    const todayStart = now.clone().startOf("day").toDate();
    const todayEnd = now.clone().endOf("day").toDate();

    const yesterdayStart = now.clone().subtract(1, "day").startOf("day").toDate();
    const yesterdayEnd = now.clone().subtract(1, "day").endOf("day").toDate();

    const thisWeekStart = now.clone().startOf("isoWeek").toDate();
    const lastWeekStart = now.clone().subtract(1, "week").startOf("isoWeek").toDate();
    const lastWeekEnd = now.clone().subtract(1, "week").endOf("isoWeek").toDate();


    // 1️⃣ TOTAL USERS (vs last week)
    const [totalUsersRaw, totalUsersLastWeekRaw] = await Promise.all([
      RegisterModel.countDocuments(),
      RegisterModel.countDocuments({ createdAt: { $lte: lastWeekEnd } })
    ]);

    const totalUsers = safe(totalUsersRaw);
    const totalUsersLastWeek = safe(totalUsersLastWeekRaw);


    // 2️⃣ NEW SIGNUPS TODAY vs YESTERDAY
    const [newTodayRaw, newYesterdayRaw] = await Promise.all([
      RegisterModel.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
      RegisterModel.countDocuments({ createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } })
    ]);

    const newSignupsToday = safe(newTodayRaw);
    const newSignupsYesterday = safe(newYesterdayRaw);


    // 3️⃣ PROFILE COMPLETED & INCOMPLETE
    const profileCompletedQuery = {
      profileImage: { $ne: null },
      gender: { $ne: null },
      currentCity: { $ne: null }
    };

    const completedRaw = await RegisterModel.countDocuments(profileCompletedQuery);
    const completedLastWeekRaw = await RegisterModel.countDocuments({
      ...profileCompletedQuery,
      createdAt: { $lte: lastWeekEnd }
    });

    const profileCompleted = safe(completedRaw);
    const profileCompletedLastWeek = safe(completedLastWeekRaw);

    const profileIncomplete = safe(totalUsersRaw - completedRaw);
    const profileIncompleteLastWeek = safe(totalUsersLastWeekRaw - completedLastWeekRaw);


    // 4️⃣ APPROVED & PENDING PROFILES
    const approvedRaw = await RegisterModel.countDocuments({ adminApprovel: "approved" });
    const approvedLastWeekRaw = await RegisterModel.countDocuments({
      adminApprovel: "approved",
      createdAt: { $lte: lastWeekEnd }
    });

    const approvedProfilesCount = safe(approvedRaw);
    const approvedProfilesLastWeek = safe(approvedLastWeekRaw);

    const pendingRaw = await RegisterModel.countDocuments({ adminApprovel: "pending" });
    const pendingLastWeekRaw = await RegisterModel.countDocuments({
      adminApprovel: "pending",
      createdAt: { $lte: lastWeekEnd }
    });

    const pendingProfilesCount = safe(pendingRaw);
    const pendingProfilesLastWeek = safe(pendingLastWeekRaw);


    // 5️⃣ FETCH PROFILE IMAGES
    const [approvedProfileImages, pendingProfileImages] = await Promise.all([
      RegisterModel.find({ adminApprovel: "approved", profileImage: { $ne: null } })
        .select("profileImage")
        .limit(4),

      RegisterModel.find({ adminApprovel: "pending", profileImage: { $ne: null } })
        .select("profileImage")
        .limit(4)
    ]);

    const approvedImageUrls = approvedProfileImages.map(u => u.profileImage);
    const pendingImageUrls = pendingProfileImages.map(u => u.profileImage);


    // 📌 FINAL RESPONSE
    res.status(200).json({
      totalUsers: {
        count: totalUsers,
        change: percentageChange(totalUsers, totalUsersLastWeek),
        trend: direction(percentageChange(totalUsers, totalUsersLastWeek))
      },

      newSignups: {
        count: newSignupsToday,
        change: percentageChange(newSignupsToday, newSignupsYesterday),
        trend: direction(percentageChange(newSignupsToday, newSignupsYesterday))
      },

      profileCompleted: {
        count: profileCompleted,
        change: percentageChange(profileCompleted, profileCompletedLastWeek),
        trend: direction(percentageChange(profileCompleted, profileCompletedLastWeek))
      },

      profileIncomplete: {
        count: profileIncomplete,
        change: percentageChange(profileIncomplete, profileIncompleteLastWeek),
        trend: direction(percentageChange(profileIncomplete, profileIncompleteLastWeek))
      },

      approvedProfiles: {
        count: approvedProfilesCount,
        change: percentageChange(approvedProfilesCount, approvedProfilesLastWeek),
        trend: direction(percentageChange(approvedProfilesCount, approvedProfilesLastWeek)),
        profileImage: approvedImageUrls
      },

      pendingProfiles: {
        count: pendingProfilesCount,
        change: percentageChange(pendingProfilesCount, pendingProfilesLastWeek),
        trend: direction(percentageChange(pendingProfilesCount, pendingProfilesLastWeek)),
        profileImage: pendingImageUrls
      }
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch user stats",
      error: err.message
    });
  }
};


export const getAllManageUserData = async (req, res) => {
  try {
    const {
      search = "",
      statusFilter = "",
      genderFilter = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 5,
    } = req.query;

    console.log(genderFilter);


    const query = {};

    /* ====================================
       🔍 SEARCH
    ==================================== */
    if (search.trim()) {
      const s = search.trim();
      const isVm = /^vm?[0-9]{3,6}$/i.test(s);

      if (isVm) {
        const clean = s.replace("vm", "");
        query.id = { $regex: clean, $options: "i" };
      } else {
        query.$or = [
          { fullName: { $regex: s, $options: "i" } },
          { firstName: { $regex: s, $options: "i" } },
          { middleName: { $regex: s, $options: "i" } },
          { lastName: { $regex: s, $options: "i" } },
          { mobile: { $regex: s, $options: "i" } },
          { email: { $regex: s, $options: "i" } },
        ];
      }
    }

    /* ====================================
       🟡 FILTERS
    ==================================== */
    if (statusFilter.trim())
      query.adminApprovel = new RegExp(statusFilter, "i");

    if (genderFilter.trim())
      query.gender = { $regex: `^${genderFilter}$`, $options: "i" };

    /* ====================================
       🔼 SORTING
    ==================================== */
    const sortFieldMap = {
      name: "fullName",
      email: "email",
      mobile: "mobile",
      gender: "gender",
      joined: "createdAt",
      status: "adminApprovel",
      lastActive: "updatedAt",
    };

    const sortKey = sortFieldMap[sortBy] || "createdAt";
    const sort = { [sortKey]: sortOrder === "asc" ? 1 : -1 };

    /* ====================================
       📌 PAGINATION
    ==================================== */
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const totalUsers = await RegisterModel.countDocuments(query);

    const users = await RegisterModel.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    /* ====================================
       🎨 FORMAT RESPONSE (✅ VERIFIED = YES / NO)
    ==================================== */
    const formatted = users.map((u, index) => {
      const fallbackId = "vm" + String(skip + index + 1).padStart(5, "0");
      const finalId = u.id || fallbackId;

      const name =
        u.fullName ||
        `${u.firstName || ""} ${u.middleName || ""} ${u.lastName || ""}`.trim() ||
        "N/A";

      const lastActiveDate = u.lastLoginAt || u.updatedAt;
      const isApproved =
        String(u.adminApprovel).toLowerCase() === "approved";

      return {
        id: finalId,
        mongoId: u._id,
        fullName: name,
        email: u.email || "N/A",
        mobile: u.mobile || "N/A",
        gender: u.gender || "N/A",
        status: u.adminApprovel || "Pending",

        // ✅ EXACT CHANGE
        verified: isApproved ? "Yes" : "No",

        location: u.currentCity || u.city || "N/A",
        profileImage: u.profileImage || null,
        joined: moment(u.createdAt).format("DD MMM, YYYY"),
        lastActive: lastActiveDate
          ? moment(lastActiveDate).format("DD MMM, YYYY")
          : "N/A",
      };
    });

    /* ====================================
       📌 FINAL RESPONSE (UNCHANGED)
    ==================================== */
    res.status(200).json({
      success: true,
      totalUsers,
      currentPage: pageNum,
      totalPages: Math.ceil(totalUsers / limitNum),
      data: formatted,
    });

  } catch (error) {
    console.error("User Manage Fetch Error:", error);
    res.status(500).json({
      success: false,
      message: "Error while fetching users",
      error: error.message,
    });
  }
};


export const updateUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateFields = req.body;

    const updatedUser = await RegisterModel.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message,
    });
  }
};

const capitalizeStatus = (status) => {
  if (!status) return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};


export const getFilteredManageUsers = async (req, res) => {
  try {
    let {
      search = "",
      status = "",
      gender = "",
      sortField = "",
      sortOrder = "asc",
      page = 1,
      limit = 5,
    } = req.query;

    const filter = {};

    /* =========================================
       🔍 SEARCH
    ========================================= */
    if (search.trim()) {
      const s = search.trim();
      const isVmId = /^vm?[0-9]{3,6}$/i.test(s);

      if (isVmId) {
        const clean = s.replace("vm", "");
        filter.vmId = { $regex: clean, $options: "i" };
      } else {
        const nameParts = s.split(" ");
        filter.$or = [
          {
            $and: [
              { firstName: { $regex: nameParts[0], $options: "i" } },
              { lastName: { $regex: nameParts[1] || "", $options: "i" } }
            ]
          },
          { email: { $regex: s, $options: "i" } },
          { mobile: { $regex: s, $options: "i" } }
        ];
      }
    }

    /* =========================================
       🟡 FILTERS (STRICT MATCH)
    ========================================= */
    if (status.trim()) {
      filter.adminApprovel = {
        $regex: `^${status}$`,
        $options: "i",
      };
    }

    if (gender.trim()) {
      filter.gender = {
        $regex: `^${gender}$`,
        $options: "i",
      };
    }

    /* =========================================
       🔽 SORTING
    ========================================= */
    const sort = {};
    const validSort = ["name", "joined", "status", "gender", "lastActive"];

    if (validSort.includes(sortField)) {
      if (sortField === "name") sort.firstName = sortOrder === "asc" ? 1 : -1;
      else if (sortField === "joined") sort.createdAt = sortOrder === "asc" ? 1 : -1;
      else if (sortField === "status") sort.adminApprovel = sortOrder === "asc" ? 1 : -1;
      else if (sortField === "gender") sort.gender = sortOrder === "asc" ? 1 : -1;
      else if (sortField === "lastActive") sort.updatedAt = sortOrder === "asc" ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }

    /* =========================================
       📌 PAGINATION
    ========================================= */
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    /* =========================================
       🧪 DEBUG (optional but useful)
    ========================================= */

    const total = await RegisterModel.countDocuments(filter);

    const users = await RegisterModel.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    /* =========================================
       🎨 FORMAT OUTPUT
    ========================================= */
    const formattedUsers = users.map((user, index) => {
      const fallbackId = "vm" + String(skip + index + 1).padStart(5, "0");
      const isApproved =
        String(user.adminApprovel).toLowerCase() === "approved";

      return {
        id: user.vmId || fallbackId,

        name:
          `${user.firstName || ""} ${user.lastName || ""}`.trim() || "N/A",

        gender: user.gender || "",
        location: user.currentCity || user.city || "",
        profileImage: user.profileImage || null,

        joined: user.createdAt
          ? new Date(user.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
          : "",

        verified: isApproved,

        lastActive: user.updatedAt
          ? new Date(user.updatedAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
          : "",

        status: capitalizeStatus(user.adminApprovel),
      };
    });


    res.status(200).json({
      users: formattedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


export const getAllReportsAnalize = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      status = "all",
      gender = "",
    } = req.query;

    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const matchStage = {};

    // Status Filter
    if (status !== "all") {
      matchStage.status = { $regex: new RegExp(`^${status}$`, "i") };
    }

    // -----------------------------
    // 🔥 MAIN PIPELINE
    // -----------------------------
    const pipeline = [
      { $match: matchStage },

      // Reporter lookup
      {
        $lookup: {
          from: "registers",
          localField: "reporter",
          foreignField: "_id",
          as: "reporter",
        },
      },
      { $unwind: "$reporter" },

      // Reported User lookup
      {
        $lookup: {
          from: "registers",
          localField: "reportedUser",
          foreignField: "_id",
          as: "reportedUser",
        },
      },
      { $unwind: "$reportedUser" },
    ];

    // -----------------------------
    // 🔍 Gender Filter
    // -----------------------------
    if (gender) {
      pipeline.push({
        $match: {
          "reportedUser.gender": { $regex: new RegExp(gender, "i") },
        },
      });
    }

    // -----------------------------
    // 🔍 Search Filter  
    // supports: name, id, reason, title
    // -----------------------------
    if (search.trim() !== "") {
      const searchRegex = new RegExp(search, "i");

      pipeline.push({
        $match: {
          $or: [
            { "reporter.firstName": searchRegex },
            { "reporter.lastName": searchRegex },
            { "reportedUser.firstName": searchRegex },
            { "reportedUser.lastName": searchRegex },
            { "reporter.id": searchRegex },
            { "reportedUser.id": searchRegex },
            { title: searchRegex },
            { reason: searchRegex },
          ],
        },
      });
    }

    // -----------------------------
    // Sorting → newest first
    // -----------------------------
    pipeline.push({ $sort: { createdAt: -1 } });

    // -----------------------------
    // Pagination
    // -----------------------------
    const countPipeline = [...pipeline, { $count: "total" }];

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // -----------------------------
    // Format Output
    // -----------------------------
    pipeline.push({
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        reason: 1,
        status: 1,
        image: 1,
        createdAt: 1,

        reporter: {
          userId: "$reporter.id",
          fullName: {
            $concat: [
              "$reporter.firstName",
              " ",
              { $ifNull: ["$reporter.lastName", ""] }
            ]
          },
          profileImage: "$reporter.profileImage",
          gender: "$reporter.gender",
          email: "$reporter.email",
        },

        reportedUser: {
          userId: "$reportedUser.id",
          fullName: {
            $concat: [
              "$reportedUser.firstName",
              " ",
              { $ifNull: ["$reportedUser.lastName", ""] }
            ]
          },
          profileImage: "$reportedUser.profileImage",
          gender: "$reportedUser.gender",
          email: "$reportedUser.email",
          adminApprovel: "$reportedUser.adminApprovel",
        },
      },
    });

    // Execute
    const reports = await ReportModel.aggregate(pipeline);

    const countDocs = await ReportModel.aggregate(countPipeline);
    const total = countDocs[0]?.total || 0;

    res.status(200).json({
      success: true,
      reports,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


export const blockReportedUser = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    const report = await ReportModel.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    await RegisterModel.findByIdAndUpdate(report.reportedUser, {
      adminApprovel: 'reject',
    });

    report.status = status || 'Blocked';
    await report.save();

    res.status(200).json({ success: true, message: 'User blocked and report updated' });
  } catch (err) {
    console.error('Error in blockReportedUser:', err);
    res.status(500).json({ success: false, message: 'Error blocking user', error: err.message });
  }
};


// GET all users
export const getAllUsers = async (req, res) => {
  try {
    const { search = "", gender, status } = req.query;

    const query = {};

    // 🔍 Search by userId, firstName, lastName, email
    if (search) {
      query.$or = [
        { userId: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // 🧍 Filter by gender
    if (gender) {
      query.gender = gender;
    }

    // 🔵 Filter by verification status
    if (status) {
      query.verificationStatus = status;
    }

    // 👉 NO PAGINATION
    const users = await RegisterModel.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: users,
      total: users.length, // optional count
    });

  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};


export const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { adminApprovel } = req.body;

  if (!['approved', 'pending', 'reject'].includes(adminApprovel)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }


  try {
    const updatedUser = await RegisterModel.findByIdAndUpdate(
      id,
      { adminApprovel, "adhaarCard.isVerified": true },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Status updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating user status:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};


export const getSingleUserById = async (req, res) => {
  try {
    const { id } = req.params;


    if (!id) return res.status(400).json({ message: 'User ID is required' });

    const user = await RegisterModel.findById(id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


export const getUserSignupTrends = async (req, res) => {
  try {
    const today = moment().startOf("day");
    const trendData = [];

    for (let i = 6; i >= 0; i--) {
      const dayStart = moment(today).subtract(i, "days").startOf("day");
      const dayEnd = moment(today).subtract(i, "days").endOf("day");

      // 🟡 NEW USERS
      const newUsers = await RegisterModel.countDocuments({
        createdAt: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() },
        adminApprovel: "approved",
      });

      // 🟢 RETURNING USERS (LOGIN DONE TODAY)
      const returningUsers = await RegisterModel.countDocuments({
        lastLogin: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() },
        adminApprovel: "approved",
      });

      trendData.push({
        date: dayStart.format("ddd"),
        newUsers,
        returningUsers,
      });
    }

    res.status(200).json({ success: true, data: trendData });

  } catch (err) {
    console.error("User Trend Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


export const getProfileOverview = async (req, res) => {
  try {
    const users = await RegisterModel.find();

    let completed = 0, incomplete = 0, moderate = 0, low = 0;

    for (const user of users) {
      let filledFields = 0;
      let totalFields = 30; // adjust this to actual key count you're considering

      const keysToCheck = [
        'profileImage', 'dateOfBirth', 'gender', 'religion', 'caste', 'community',
        'height', 'diet', 'education', 'employedIn', 'annualIncome', 'occupation',
        'fatherOccupation', 'motherOccupation', 'ownHouse', 'ownCar',
        'smoking', 'drinking', 'hobbies', 'interests', 'aboutYourself'
      ];

      for (const key of keysToCheck) {
        if (user[key] && user[key] !== '') filledFields++;
      }

      const percentage = (filledFields / keysToCheck.length) * 100;

      if (percentage >= 80) completed++;
      else if (percentage >= 50) moderate++;
      else if (percentage >= 20) low++;
      else incomplete++;
    }

    return res.status(200).json({
      success: true,
      data: [
        { name: 'Completed', value: completed },
        { name: 'Moderate', value: moderate },
        { name: 'Low', value: low },
        { name: 'Incomplete', value: incomplete }
      ]
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// === 2. Matches Per Month Chart ===
export const getMatchesPerMonth = async (req, res) => {
  try {
    const currentYear = moment().year();
    const months = moment.monthsShort();

    const result = await Promise.all(
      months.map(async (month, index) => {
        const start = moment()
          .year(currentYear)
          .month(index)
          .startOf("month")
          .toDate();

        const end = moment()
          .year(currentYear)
          .month(index)
          .endOf("month")
          .toDate();

        const totalUsers = await RegisterModel.countDocuments({
          createdAt: { $gte: start, $lte: end },
        });

        const matches = await AccountRequestModel.countDocuments({
          status: "accepted",
          createdAt: { $gte: start, $lte: end },
        });

        return {
          month,
          totalUsers,
          matches,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Matches Per Month Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};


const normalizeTitle = (title = '') => {
  const t = title.toLowerCase();

  if (t.includes('fake')) return 'fake';
  if (t.includes('inappropriate')) return 'inappropriate';
  if (t.includes('harassment')) return 'harassment';
  if (t.includes('spam')) return 'spam';
  return null;
};


export const getWeeklyReports = async (req, res) => {
  try {
    const today = moment().startOf('day');
    const weekAgo = moment().subtract(6, 'days').startOf('day');

    const reports = await ReportModel.find({
      createdAt: { $gte: weekAgo.toDate(), $lte: today.clone().endOf('day').toDate() },
    }).select('title createdAt');

    const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartData = Array(7).fill().map((_, i) => ({
      day: dayMap[i],
      fake: 0,
      inappropriate: 0,
      harassment: 0,
      spam: 0,
    }));

    reports.forEach((r) => {
      const normalized = normalizeTitle(r.title);
      if (!normalized) return;

      const dayIndex = new Date(r.createdAt).getDay();
      chartData[dayIndex][normalized]++;
    });

    res.status(200).json({ success: true, data: chartData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};


export const getSearchToMatchStats = async (req, res) => {
  try {
    // 1️⃣ Total users
    const totalUsers = await RegisterModel.countDocuments();

    // 2️⃣ Complete profile (better conditions)
    const completeProfiles = await RegisterModel.countDocuments({
      firstName: { $exists: true, $ne: "" },
      profileImage: { $exists: true, $ne: "" },
      dateOfBirth: { $ne: null },
      gender: { $in: ["Male", "Female"] },
      religion: { $exists: true, $ne: "" },
      caste: { $exists: true, $ne: "" },
      currentCity: { $exists: true, $ne: "" },
    });

    // 3️⃣ Matches = accepted requests
    const matchedProfiles = await AccountRequestModel.countDocuments({
      status: "accepted",
    });

    // 4️⃣ Reported profiles
    const reportedProfiles = await ReportModel.countDocuments();

    // 5️⃣ Funnel data
    const funnelData = [
      { stage: "Total Profiles", value: totalUsers },
      { stage: "Complete Profiles", value: completeProfiles },
      { stage: "Matched Profiles", value: matchedProfiles },
      { stage: "Reported Profiles", value: reportedProfiles },
    ];

    res.json({
      success: true,
      data: funnelData,
    });

  } catch (error) {
    console.error("Funnel Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


export const verifyAadhaar = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await RegisterModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.adhaarCard?.frontImage || !user.adhaarCard?.backImage) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar images are required to verify.',
      });
    }

    // Update Aadhaar verification
    user.adhaarCard.isVerified = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Aadhaar verified successfully',
    });
  } catch (error) {
    console.error('Aadhaar verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during Aadhaar verification',
    });
  }
};

export const updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    let { status } = req.body; // approved | rejected

    /* ================= VALIDATION ================= */

    console.log(status);

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    status = status.toLowerCase();

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Use approved or rejected",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    /* ================= FETCH REPORT ================= */

    const report = await ReportModel.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    const io = global.io;

    let updatedReportedUser = null;
    let finalReportStatus = null;

    /* ================= ADMIN ACTION ================= */

    if (status === "approved") {
      // Report approved → reported user BLOCK
      updatedReportedUser = await RegisterModel.findByIdAndUpdate(
        report.reportedUser,
        { adminApprovel: "blocked" },
        { new: true }
      );

      finalReportStatus = "blocked";
    }

    if (status === "rejected") {
      // Report rejected → reported user remains APPROVED
      updatedReportedUser = await RegisterModel.findByIdAndUpdate(
        report.reportedUser,
        { adminApprovel: "approved" },
        { new: true }
      );

      finalReportStatus = "approved";
    }

    report.status = finalReportStatus;
    await report.save();

    /* =====================================================
       🔔 1️⃣ NOTIFICATION → REPORTER (jisne report ki)
    ===================================================== */

    const reporterMessage =
      status === "approved"
        ? "Your report has been accepted. Appropriate action has been taken."
        : "Your report has been reviewed and rejected.";

    const reporterNotification = await Notification.create({
      user: report.reporter,
      userModel: "Register", // ✅ REQUIRED
      title: "Report Update",
      message: reporterMessage,
      read: false,
    });

    io?.to(String(report.reporter)).emit(
      "notification",
      reporterNotification
    );

    const reporterUser = await RegisterModel.findById(report.reporter);
    if (reporterUser?.expoToken) {
      sendExpoPush(
        reporterUser.expoToken,
        "Report Update",
        reporterMessage
      ).catch(() => { });
    }

    /* =====================================================
       🔔 2️⃣ NOTIFICATION → REPORTED USER
    ===================================================== */

    const reportedUserMessage =
      finalReportStatus === "blocked"
        ? "Your account has been blocked due to a reported violation."
        : "A report against your account was reviewed and no action was taken.";

    const reportedUserNotification = await Notification.create({
      user: report.reportedUser,
      userModel: "Register", // ✅ REQUIRED
      title: "Account Update",
      message: reportedUserMessage,
      read: false,
    });

    io?.to(String(report.reportedUser)).emit(
      "notification",
      reportedUserNotification
    );

    if (updatedReportedUser?.expoToken) {
      sendExpoPush(
        updatedReportedUser.expoToken,
        "Account Update",
        reportedUserMessage
      ).catch(() => { });
    }

    /* ================= FINAL RESPONSE ================= */

    return res.status(200).json({
      success: true,
      message:
        status === "approved"
          ? "Report approved and user blocked"
          : "Report rejected and no action taken",
      reportStatus: finalReportStatus,
      reportedUserStatus: updatedReportedUser?.adminApprovel,
    });

  } catch (error) {
    console.error("updateReportStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating report",
      error: error.message,
    });
  }
};

export const getWeeklyRequestStats = async (req, res) => {
  try {
    const now = moment().tz("Asia/Kolkata");

    // THIS WEEK (Mon → Sun)
    const thisWeekStart = now.clone().startOf("isoWeek").toDate();
    const thisWeekEnd = now.clone().endOf("isoWeek").toDate();

    // ====================================
    // RUN QUERIES (Mixed week + total)
    // ====================================

    const [
      totalRequestsThisWeek,   // WEEK WISE
      pendingVerification,     // TOTAL
      approvedThisWeek,        // WEEK WISE
      rejectedDueToMismatch    // TOTAL
    ] = await Promise.all([

      // 1️⃣ Total Requests This Week
      RegisterModel.countDocuments({
        createdAt: { $gte: thisWeekStart, $lte: thisWeekEnd }
      }),

      // 2️⃣ Pending Verification (All-time)
      RegisterModel.countDocuments({
        adminApprovel: "pending"
      }),

      // 3️⃣ Approved This Week
      RegisterModel.countDocuments({
        adminApprovel: "approved",
        createdAt: { $gte: thisWeekStart, $lte: thisWeekEnd }
      }),

      // 4️⃣ Rejected Due to mismatch (All-time)
      RegisterModel.countDocuments({
        adminApprovel: "reject"
      })
    ]);

    // ====================================
    // SEND RESPONSE
    // ====================================
    return res.status(200).json({
      success: true,
      data: {
        totalRequestsThisWeek,
        pendingVerification,
        approvedThisWeek,
        rejectedDueToMismatch
      }
    });

  } catch (err) {
    console.error("Weekly Request Stats Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message
    });
  }
};
