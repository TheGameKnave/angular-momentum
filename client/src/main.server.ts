import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { AppComponent } from '@app/app.component';
import { serverConfig } from './app.config.server';

const bootstrap = (context: BootstrapContext) => bootstrapApplication(AppComponent, serverConfig, context);

export default bootstrap;
