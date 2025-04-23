import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { chromium, Browser } from 'playwright';

@Injectable()
export class PlaywrightServiceTool implements OnModuleInit, OnModuleDestroy {
  private browser: Browser;

  async onModuleInit() {
    this.browser = await chromium.launch({ headless: false });
  }

  async onModuleDestroy() {
    await this.browser.close();
  }

  getBrowser() {
    return this.browser;
  }
}
