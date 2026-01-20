import { Router } from 'express';
import process from 'process';

const routes = Router();

// Health Check Endpoint
// Used by load balancers and for developer verification
routes.get('/health', (request, response) => {
  return response.json({
    status: 'OK',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export { routes };