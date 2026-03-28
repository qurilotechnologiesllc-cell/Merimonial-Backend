import express from 'express';
import { getAllMatches, getmatchesWithProfile, preferencesProfile, getMutualMatchesProfile } from '../controller/matchController.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';

const matchesRoute = express.Router();

matchesRoute.get('/all', authenticateUser, getAllMatches);

matchesRoute.get('/matches-with-profile', authenticateUser, getmatchesWithProfile)

matchesRoute.get("/preferences-profiles", authenticateUser, preferencesProfile)

matchesRoute.get("/user-mutual-profiles", authenticateUser, getMutualMatchesProfile)


export default matchesRoute;
