import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    message: 'Vercel Function is WORKING!',
    time: new Date().toISOString(),
    env_db_host: process.env.DB_HOST ? 'Set' : 'Missing',
    env_jwt: process.env.JWT_SECRET ? 'Set' : 'Missing'
  });
}
