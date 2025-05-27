import { NextApiRequest } from 'next';

export async function getBotIdFromRequest(req: NextApiRequest): Promise<string | null> {
  const botId = req.query.botId as string;
  return botId || null;
} 