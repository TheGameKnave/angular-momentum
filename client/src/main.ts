import { HttpErrorResponse } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from '@app/app.component';
import { appProviders } from 'src/main.config';

bootstrapApplication(AppComponent, {
  providers: appProviders,
})
/* istanbul ignore next */
.catch((err) => {
  if (err instanceof HttpErrorResponse) {
    /**/console.warn('Backend server not available:', err);
    // Provide a fallback behavior or display an error message to the user
    // alert('Backend server not available. Please try again later.');
  } else {
    /**/console.error('Error bootstrapping application:', err);
  }
});
