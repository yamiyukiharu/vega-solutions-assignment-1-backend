import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './transaction/modules/Worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);

  app.init();

  // Gracefully shutdown the application on interrupt signals (e.g., Ctrl+C)
  process.on('SIGINT', async () => {
    await app.close();
    process.exit(0);
  });
}

bootstrap();
