import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getCongratsMessage(): string {
    return 'Welcome to Rampa Cash API';
  }
}
