import express from 'express';
import { authenticateUser } from '../middlewares/authMiddleware.js';
import {
  getReceivedRequests,
  getReceivedRequestsByStatus,
  getRejectedRequests,
  getAcceptedRequests,
  getRequestsAcceptedByOthers,
  getSentRequests,
  sendRequest,
  updateAccountRequestStatus,
  deleteAccountRequest, // <-- we need to create this in controller
  restoreMatches,
} from '../controller/accountRequestController.js';

const accountRouter = express.Router();

accountRouter.post('/send', authenticateUser, sendRequest);
accountRouter.get('/getSendRequest', authenticateUser, getSentRequests);
accountRouter.get('/received', authenticateUser, getReceivedRequests);

accountRouter.patch('/update-request-status', authenticateUser, updateAccountRequestStatus);
accountRouter.get('/accepted-by-me', authenticateUser, getAcceptedRequests);
accountRouter.get('/rejected-by-me', authenticateUser, getRejectedRequests);
accountRouter.delete('/delete-send-request', authenticateUser, deleteAccountRequest);
accountRouter.patch("/restore", authenticateUser, restoreMatches)

accountRouter.get('/receivedData', authenticateUser, getReceivedRequestsByStatus);
accountRouter.get('/accepted-by-others', authenticateUser, getRequestsAcceptedByOthers);

// ✅ Add DELETE route for frontend

export default accountRouter;
