import app from './app';
import { env } from './config/env';
import { initializeDatabase } from './config/database';

// Initialize database tables
initializeDatabase();

app.listen(env.port, () => {
  console.log(`Zorvyn Finance API running on http://localhost:${env.port}`);
  console.log(`Environment: ${env.nodeEnv}`);
});
