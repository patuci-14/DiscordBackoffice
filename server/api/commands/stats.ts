import { NextApiRequest, NextApiResponse } from 'next';
import { storage } from '../../storage';
import { getBotIdFromRequest } from '../../utils/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let botId = await getBotIdFromRequest(req);
    if (!botId) {
      botId = req.query.botId as string;
    }
    console.log('API /commands/stats - botId recebido:', botId);
    if (!botId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let count = 0;
    try {
      count = await storage.getCommandsUsedLast24Hours(botId);
    } catch (err) {
      console.error('Erro no getCommandsUsedLast24Hours:', err);
      return res.status(400).json({ error: 'Erro ao buscar comandos usados nas últimas 24h', details: String(err) });
    }
    return res.status(200).json({ count });
  } catch (error) {
    console.error('Error fetching command stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 