import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { catchError, first, of } from 'rxjs';

const query = `
query GetApiData {
  docs
}
`;
interface InitializeApiRes {
  data: {
    docs: string;
  };
}
@Component({
  selector: 'app-graphql-api',
  imports: [
    MarkdownComponent,
  ],
  templateUrl: './graphql-api.component.html',
})
export class GraphqlApiComponent implements OnInit {
  private http = inject(HttpClient);
  private cd = inject(ChangeDetectorRef);

  results!: InitializeApiRes;
  error: unknown = null;

  ngOnInit(): void {
    this.initializeApi().pipe(
      catchError((error: unknown) => {
        this.error = error;
        return of(null); // Return an empty observable to continue the chain
      }),
      first()
    ).subscribe((response: unknown) => {
      this.results = (response as InitializeApiRes) || null;
      this.cd.detectChanges();
    });
  }
  initializeApi(){
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    return this.http.post('/api', { query }, httpOptions);
  }
}
