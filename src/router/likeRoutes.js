import express from 'express';
import {
  sendLike,
  getReceivedLikes,
  getSentLikes,
  getAllUsersILiked,
  unlikeUser,
  getMatchedUsers,
  getTheyShortlisted,
  getIShortlisted,
  getUnlikedProfiles,
  gettheCountofLikeAndUnlike,
  restoreUnlikedProfilfromSender
} from '../controller/likeController.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';

const likeRoute = express.Router();

likeRoute.post('/send', authenticateUser, sendLike);
likeRoute.get('/sent', authenticateUser, getSentLikes);
likeRoute.get('/received', authenticateUser, getReceivedLikes);
likeRoute.get('/home', authenticateUser, getAllUsersILiked);
likeRoute.get('/allMatches', authenticateUser, getMatchedUsers);
likeRoute.get('/theyShortlist', authenticateUser, getTheyShortlisted);
likeRoute.get('/iShortlist', authenticateUser, getIShortlisted);
likeRoute.post('/unlike', authenticateUser, unlikeUser);
likeRoute.get('/cross-profile', authenticateUser, getUnlikedProfiles)
likeRoute.get("/count", authenticateUser, gettheCountofLikeAndUnlike)
likeRoute.post('/restore-unlike-profile', authenticateUser, restoreUnlikedProfilfromSender)

export default likeRoute;
