import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Dynamic import to catch initialization errors
    const appModule = await import('../src/index.js');
    const app = appModule.default;
    
    // Bridge Express app to Vercel handler
    app(req, res);
  } catch (error: any) {
    console.error('CRITICAL STARTUP ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Server failed to start (Module Load Error)',
      error: error.message,
      stack: error.stack
    });
  }
}
