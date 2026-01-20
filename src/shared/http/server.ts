import 'dotenv/config';
import { app } from './app';
import process from 'process';

const PORT = process.env.PORT || 3333;

const start = async () => {
  try {
    // Database connection will be initialized here in Milestone 2
    // await AppDataSource.initialize();
    
    app.listen(PORT, () => {
      console.log(`🚀 OnniBox Backend started on port ${PORT}!`);
      console.log(`📡 Health Check: http://localhost:${PORT}/api/v1/health`);
    });
  } catch (error) {
    console.error('❌ Error during server startup:', error);
    process.exit(1);
  }
};

start();