import { Global, Module } from '@nestjs/common';
import { I18nService, I18N_CONFIG, DEFAULT_I18N_CONFIG } from './i18n.service';

@Global()
@Module({
  providers: [I18nService, { provide: I18N_CONFIG, useValue: DEFAULT_I18N_CONFIG }],
  exports: [I18nService],
})
export class I18nModule {}
