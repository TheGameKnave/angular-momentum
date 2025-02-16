import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-api',
  standalone: true,
  imports: [
    MarkdownComponent,
  ],
  templateUrl: './api.component.html',
  styles: ``
})
export class ApiComponent {
  results: any = null;
  error: any = null;

  constructor(
    private http: HttpClient,
    private cd: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.initializeApi().pipe(
      catchError(error => {
        this.error = error;
        return of(null); // Return an empty observable to continue the chain
      })
    ).subscribe((response: any) => {
      this.results = response?.['data'] || null;
      this.cd.detectChanges();
    });
  }
  initializeApi(){
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };
    const query = `
      query GetApiData {
        docs
      }
    `;
    return this.http.post('/graphql', { query }, httpOptions);
  }
}
