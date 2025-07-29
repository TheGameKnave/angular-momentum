import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ENVIRONMENT } from 'src/environments/environment';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { catchError, of, Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';

const query = `
query GetApiData {
  docs
}
`;

export interface InitializeApiRes {
  data: {
    docs: string;
  };
}

@Component({
  selector: 'app-graphql-api',
  templateUrl: './graphql-api.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MarkdownComponent,
    AsyncPipe,
  ],
})
export class GraphqlApiComponent implements OnInit {
  results$: Observable<InitializeApiRes | null> = of(null);
  error: unknown = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.results$ = this.initializeApi().pipe(
      catchError((error: unknown) => {
        this.error = error;
        return of(null);
      })
    );
  }

  private initializeApi(): Observable<InitializeApiRes> {
    return this.http.post<InitializeApiRes>(ENVIRONMENT.baseUrl + '/api', { query }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }
}
