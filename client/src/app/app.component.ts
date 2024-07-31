import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { UpdateService } from './services/update.service';
import { CookieService } from 'ngx-cookie-service';
import { AutoUnsubscribe } from "src/app/helpers/unsub";

import packageJson from '../../../package.json';
import { SUPPORTED_LANGUAGES } from 'src/app/helpers/constants';

import { ExampleOneComponent } from './components/example-one/example-one.component';
import { ExampleTwoComponent } from './components/example-two/example-two.component';
import { FooterComponent } from './components/shared/footer/footer.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        ExampleOneComponent,
        ExampleTwoComponent,
        FooterComponent,
    ],
    styles: ``
})
@AutoUnsubscribe()
export class AppComponent implements OnInit, OnDestroy {
  public version: string = packageJson.version;
  public componentToShow: string = 'example-one';
  public userLang: string = '';
  public displayApp: boolean = false;

  constructor(
    private cookieService: CookieService,
    private updateService: UpdateService,
    private changeDetector: ChangeDetectorRef,
  ){
    this.updateService.checkForUpdates();
  }

  ngOnInit(): void {
    // get current cookie OR browser default language
    this.userLang = this.cookieService.get('lang') || navigator.language;
    // check if assigned language is supported
    if (!SUPPORTED_LANGUAGES.includes(this.userLang)) {
      // if not, try to get the non-localized language
      this.userLang = this.userLang.split('-')[0];
    }
    if(!SUPPORTED_LANGUAGES.includes(this.userLang)) {
      // if not, try to get the nearest localized language
      // if not, use english
      this.userLang = SUPPORTED_LANGUAGES.find(lang => lang.startsWith(this.userLang)) || 'en';
    }
    // set language in the cookie (mainly important for first load)
    this.cookieService.set('lang', this.userLang);
    // set language in the translate service
    // listen for language changes and display the app
    // this.translate.use(this.userLang).subscribe(() => {
    //   this.displayApp = !!this.userLang && !!this.translate.currentLang;
    //   this.changeDetector.detectChanges();
    // });
  }
  
  onComponentToggle(component: string): void {
    this.componentToShow = component;
  }

  ngOnDestroy(): void {}
}

