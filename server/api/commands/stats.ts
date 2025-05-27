import { NextApiRequest, NextApiResponse } from 'next';
import { storage } from '../../storage';
import { getBotIdFromRequest } from '../../utils/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const botId = await getBotIdFromRequest(req);
    if (!botId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const count = await storage.getCommandsUsedLast24Hours(botId);
    return res.status(200).json({ count });
  } catch (error) {
    console.error('Error fetching command stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 