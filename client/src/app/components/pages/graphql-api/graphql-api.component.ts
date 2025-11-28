import { HttpClient } from '@angular/common/http';
import { ENVIRONMENT } from 'src/environments/environment';
import { ChangeDetectionStrategy, Component, DestroyRef,   OnInit, signal } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { catchError, of, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CardModule } from 'primeng/card';
import { TranslocoDirective } from '@jsverse/transloco';

const query = `
query GetApiData {
  docs
}
`;

export interface GraphQLDocsResponse {
  data: {
    docs: string;
  };
}

/**
 * GraphQL API demonstration component that showcases GraphQL query execution.
 *
 * This component fetches and displays API documentation using a GraphQL query,
 * demonstrating how to use GraphQL in an Angular application.
 *
 * Features:
 * - GraphQL query execution via HTTP POST to /graphql endpoint
 * - Proper error handling with translated error messages
 * - Loading state management with signals
 * - Markdown rendering of API documentation
 */
@Component({
  selector: 'app-graphql-api',
  templateUrl: './graphql-api.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MarkdownComponent,
    CardModule,
    TranslocoDirective,
  ],
})
export class GraphqlApiComponent implements OnInit {
  readonly docs = signal<string>('');
  readonly error = signal<boolean>(false);

  constructor(
    readonly http: HttpClient,
    private readonly destroyRef: DestroyRef,
  ){}

  /**
   * Angular lifecycle hook called after component initialization.
   * Fetches API documentation from the GraphQL endpoint and handles errors.
   */
  ngOnInit() {
    this.fetchApiDocs();
  }

  /**
   * Fetches API documentation using a GraphQL query to /gql endpoint (proxied to /graphql).
   * Demonstrates GraphQL query execution with proper error handling.
   */
  private fetchApiDocs(): void {
    this.http.post<GraphQLDocsResponse>(ENVIRONMENT.baseUrl + '/gql', { query })
      .pipe(
        tap((response) => {
          if (response?.data?.docs) {
            this.docs.set(response.data.docs);
            this.error.set(false);
          } else {
            this.error.set(true);
          }
        }),
        catchError((error: unknown) => {
          console.error('Error fetching GraphQL API docs:', error);
          this.error.set(true);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }
}
