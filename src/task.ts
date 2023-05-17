import { NestFactory } from '@nestjs/core';
import { TaskModule } from './transaction/task.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(TaskModule);

  app.init();

  // Gracefully shutdown the application on interrupt signals (e.g., Ctrl+C)
  process.on('SIGINT', async () => {
    await app.close();
    process.exit(0);
  });
}

bootstrap();
