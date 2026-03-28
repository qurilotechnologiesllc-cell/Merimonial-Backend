import { jwtVerify, SignJWT } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";
const secret = new TextEncoder().encode(JWT_SECRET);

/*
  Generate Token
*/
export const generateToken = async (user) => {

  const token = await new SignJWT({
    userId: user._id.toString(),   // 👈 FIX: convert ObjectId to string
    email: user.email,
    role: user.role
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  return token;
};


/*
  Authenticate Middleware
*/
export const authenticateUser = async (req, res, next) => {

  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    const token = authHeader.split(" ")[1];

    const { payload } = await jwtVerify(token, secret);

    req.user = {
      userId: payload.userId,  // now string
      email: payload.email,
      role: payload.role
    };

    next();

  } catch (error) {

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });

  }

};