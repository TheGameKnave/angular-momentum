import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, signal, inject } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { catchError, of, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CardModule } from 'primeng/card';
import { TranslocoDirective } from '@jsverse/transloco';
import { GraphqlService } from '@app/services/graphql.service';

/**
 * GraphQL API demonstration component that showcases GraphQL query execution.
 *
 * This component fetches and displays API documentation using a GraphQL query,
 * demonstrating how to use GraphQL in an Angular application.
 *
 * Features:
 * - Delegates GraphQL operations to GraphqlService
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
  private readonly graphqlService = inject(GraphqlService);
  private readonly destroyRef = inject(DestroyRef);

  readonly docs = signal<string>('');
  readonly error = signal<boolean>(false);

  /**
   * Angular lifecycle hook called after component initialization.
   * Fetches API documentation from the GraphQL endpoint and handles errors.
   */
  ngOnInit() {
    this.fetchApiDocs();
  }

  /**
   * Fetches API documentation using the GraphQL service.
   * Sets error state if the fetch fails or returns empty content.
   */
  private fetchApiDocs(): void {
    this.graphqlService.fetchDocs()
      .pipe(
        tap((docs) => {
          if (docs) {
            this.docs.set(docs);
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
