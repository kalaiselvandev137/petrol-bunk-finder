
import jwt from 'jsonwebtoken';


export const generateSessionToken = (email, customerId) => {
  const payload = {email: email.toLowerCase(),customerId,type: 'customer_session'};
  return jwt.sign(payload, process.env.TOKENSECRET , {expiresIn: '24h'});};


export const verifySessionToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.TOKENSECRET );
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
};


export const extractToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};


export const verifyCustomerSession = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (!token) {
      return res.status(401).send({ message: "Authentication required" });
    }

    const decoded = verifySessionToken(token);

    if (!decoded) {
      return res.status(401).send({ message: "Invalid or expired session" });
    }
    req.customer = {email: decoded.email,customerId: decoded.customerId};
    next();
  } catch (error) {
    console.error('Session verification error:', error);
    return res.status(401).send({ message: "Authentication failed" });
  }
};