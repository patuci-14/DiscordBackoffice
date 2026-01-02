import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

// Credenciais do admin (em produção, isso deveria estar em um banco de dados)
const ADMIN_USERNAME = 'admin';
// Hash da senha: ACZUQqm9Gk892**Jukp_!QsCTU6jpf
const ADMIN_PASSWORD_HASH = '$2b$10$vnL8Z27X7ukdSKPw3XY6.Olm1pm0TRGZWSNw6eOa4EbAVCSfgvtLO';

// Chave secreta para JWT (em produção, use uma variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Tempo de expiração do token (24 horas)
const JWT_EXPIRES_IN = '24h';

export interface UserPayload {
  username: string;
  iat?: number;
  exp?: number;
}

/**
 * Login de usuário com username e senha
 */
export const userLogin = async (req: Request, res: Response) => {
  try {
    console.log('=== USER LOGIN START ===');
    console.log('Request body:', JSON.stringify(req.body));
    
    const { username, password } = req.body;
    console.log('Extracted username:', username);
    console.log('Extracted password length:', password?.length);

    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({
        success: false,
        error: 'Username e senha são obrigatórios'
      });
    }

    // Verificar credenciais
    console.log('Checking username:', username, 'against:', ADMIN_USERNAME);
    if (username !== ADMIN_USERNAME) {
      console.log('Invalid username');
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas'
      });
    }

    // Verificar senha
    console.log('Checking password...');
    console.log('bcrypt type:', typeof bcrypt);
    console.log('bcrypt.default:', typeof bcrypt.default);
    console.log('bcrypt.compare type:', typeof bcrypt?.compare);
    console.log('bcrypt.default?.compare type:', typeof bcrypt.default?.compare);
    console.log('ADMIN_PASSWORD_HASH:', ADMIN_PASSWORD_HASH);
    
    try {
      // bcryptjs em ES modules pode estar em bcrypt.default
      const bcryptCompare = bcrypt.default?.compare || bcrypt.compare;
      const isValidPassword = await bcryptCompare(password, ADMIN_PASSWORD_HASH);
      console.log('Password validation result:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('Invalid password');
        return res.status(401).json({
          success: false,
          error: 'Credenciais inválidas'
        });
      }
    } catch (bcryptError) {
      console.error('Bcrypt error:', bcryptError);
      throw bcryptError;
    }

    // Gerar token JWT
    console.log('Generating JWT token...');
    // jwt em ES modules pode estar em jwt.default
    const jwtSign = jwt.default?.sign || jwt.sign;
    const token = jwtSign(
      { username: ADMIN_USERNAME },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    console.log('Token generated successfully');

    console.log('=== USER LOGIN SUCCESS ===');
    return res.status(200).json({
      success: true,
      token,
      user: {
        username: ADMIN_USERNAME
      }
    });
  } catch (error) {
    console.error('=== USER LOGIN ERROR ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor durante o login'
    });
  }
};

/**
 * Verificar status de autenticação do usuário
 */
export const checkUserAuthStatus = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        error: 'Token não fornecido'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    try {
      // jwt em ES modules pode estar em jwt.default
      const jwtVerify = jwt.default?.verify || jwt.verify;
      const decoded = jwtVerify(token, JWT_SECRET) as UserPayload;
      
      return res.status(200).json({
        success: true,
        authenticated: true,
        user: {
          username: decoded.username
        }
      });
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        error: 'Token inválido ou expirado'
      });
    }
  } catch (error) {
    console.error('User auth status check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor ao verificar autenticação'
    });
  }
};

/**
 * Logout do usuário (apenas limpa o token no cliente)
 */
export const userLogout = async (req: Request, res: Response) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    console.error('User logout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor durante o logout'
    });
  }
};

// Exportar JWT_SECRET para uso no middleware
export { JWT_SECRET };

