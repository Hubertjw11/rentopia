import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";

interface DecodedToken extends JwtPayload {
  sub: string;
  "custom:role"?: string;
  email?: string;
  email_verified?: boolean | string;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        email: string | null;
        emailVerified: boolean;
      };
    }
  }
}

const issuer = `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`;
const jwks = new JwksClient({
  jwksUri: `${issuer}/.well-known/jwks.json`,
  cache: true,
});

const getKey: jwt.GetPublicKeyOrSecret = (header, callback) => {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) callback(err);
    else callback(null, key!.getPublicKey());
  });
};

const verifyToken = (token: string): Promise<DecodedToken> =>
  new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      { issuer, algorithms: ["RS256"] },
      (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded as DecodedToken);
      },
    );
  });

export const authMiddleware = (allowedRoles: string[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      res.status(401).json({ message: "Unauthorized!" });
      return;
    }

    try {
      const decoded = await verifyToken(token);
      const userRole = decoded["custom:role"] || "";
      req.user = {
        id: decoded.sub,
        role: userRole,
        email: typeof decoded.email === "string" ? decoded.email : null,
        emailVerified:
          decoded.email_verified === true || decoded.email_verified === "true",
      };

      const hasAccess = allowedRoles.includes(userRole.toLowerCase());
      if (!hasAccess) {
        res.status(403).json({ message: "Access Denied!" });
        return;
      }
    } catch (err) {
      console.error("Failed to verify token:", err);
      res.status(401).json({ message: "Invalid token" });
      return;
    }

    next();
  };
};


/** Ensures the caller can only touch their OWN :cognitoId resources. */
export const requireSelf = (paramName = "cognitoId") => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requested = (req.params as Record<string, string>)[paramName];

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized!" });
      return;
    }

    if (req.user.id !== requested) {
      res.status(403).json({ message: "Access Denied!" });
      return;
    }

    next();
  };
};