import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../controllers/user-auth-controller';

export interface AuthenticatedRequest extends Request {
  user?: {
    username: string;
  };
}

/**
 * Middleware para verificar autenticação JWT
 */
export const requireUserAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticação não fornecido'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    try {
      // jwt em ES modules pode estar em jwt.default
      const jwtVerify = jwt.default?.verify || jwt.verify;
      const decoded = jwtVerify(token, JWT_SECRET) as { username: string };
      req.user = { username: decoded.username };
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido ou expirado'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor na autenticação'
    });
  }
};

