import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
    @Get()
    getCongratsMessage(): string {
        return 'Welcome to Rampa Cash API';
    }
}
// Test hot reload
// Hot reload test - Wed Sep  3 02:19:54 CEST 2025
