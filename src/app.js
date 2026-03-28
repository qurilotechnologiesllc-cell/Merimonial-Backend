import express from 'express';
import cors from 'cors';

// here is all user related Router 
import userauthRoute from './router/userauthRoutes.js';
import accountRouter from './router/accountRequestRoutes.js';
import likeRoute from './router/likeRoutes.js';
import recommendationRoute from './router/recommendationRoutes.js';
import messageRoutes from './router/messageRoutes.js';
import reportRouter from './router/reportRoutes.js';
import partnerRoute from './router/partnerPreferenceRoutes.js';
import additionalDetail from './router/additionalDetailsRoutes.js';
import masterRoute from './router/masterDataRoutes.js';
import matchesRoute from './router/matchRoutes.js';
import profileRouter from './router/profileRoute.js';
import blockRouter from './router/blockRoutes.js';
import profileViewRouter from './router/profileViewRoutes.js';
import similarRouter from './router/similarProfileRoutes.js';
import notificationRouter from "./router/notificationRoutes.js"

// here is all super admin router 
import adminRoute from './router/adminApi.js';
import adminauthRoute from './router/adminauthRoutes.js'
import BannersRoutes from "./router/topbannerRoutes.js"

// here is all sub admin router
import SubAdminAuth from "./router/subAdminAuthRoutes.js"

const app = express();

app.use(cors({
    origin: [
        "https://6jnqmj85-3000.inc1.devtunnels.ms",
        "http://localhost:3000",
        "http://localhost:3001",
        "https://matrimonial-main.vercel.app",
        "https://matro-main4444-main.vercel.app"
    ],
    credentials: true
}));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use('/auth', userauthRoute)
app.use('/api/profile',profileRouter)
app.use('/api/request',accountRouter)
app.use('/api/like',likeRoute)
app.use('/api/match', matchesRoute);
app.use('/api/recommendation', recommendationRoute);
app.use('/api/message', messageRoutes);
app.use('/api/report', reportRouter);
app.use('/api/partner',partnerRoute);
app.use('/api/basic-details',additionalDetail);
app.use('/api/master', masterRoute);
app.use('/api/profile/view',profileViewRouter);
app.use('/api/cross',blockRouter);
app.use('/api/similar',similarRouter);
app.use("/api/notification", notificationRouter)

// here we is the all routes related to admin
app.use('/api/auth', adminauthRoute)
app.use('/admin',adminRoute);
app.use("/api/banner", BannersRoutes);

app.use('/api/sub-admin', SubAdminAuth)


export default app; 
