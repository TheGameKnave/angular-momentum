import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ENVIRONMENT } from 'src/environments/environment';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { catchError, of, Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { FeatureMonitorService } from '@app/services/feature-monitor.service';
import { CardModule } from 'primeng/card';
import { TranslocoDirective } from '@jsverse/transloco';

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
    CardModule,
    TranslocoDirective,
  ],
})
export class GraphqlApiComponent implements OnInit {
  results$: Observable<InitializeApiRes | null> = of(null);
  error: unknown = null;

  constructor(
    readonly http: HttpClient,
    private readonly featureMonitorService: FeatureMonitorService,
  ){}

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
