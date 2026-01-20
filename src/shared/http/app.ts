import 'reflect-metadata';
import 'express-async-errors';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { routes } from './routes';

const app = express();

// 1. Security & Utilities
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

// 2. Routes (API V1)
app.use('/api/v1', routes);

// 3. Global Error Handler
app.use((err: Error, request: Request, response: Response, next: NextFunction) => {
  if (err instanceof Error) {
    return response.status(400).json({
      status: 'error',
      message: err.message,
    });
  }

  console.error(err);
  return response.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
});

export { app };