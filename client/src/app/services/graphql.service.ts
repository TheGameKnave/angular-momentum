import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ENVIRONMENT } from 'src/environments/environment';

/**
 * Response structure for GraphQL API documentation query.
 */
export interface GraphQLDocsResponse {
  data: {
    docs: string;
  };
}

/**
 * Response structure for sending localized notifications.
 */
export interface SendNotificationResponse {
  data: {
    sendLocalizedNotification: {
      success: boolean;
      message: string;
    };
  };
}

/**
 * Result from sending a notification.
 */
export interface NotificationResult {
  success: boolean;
  message: string;
}

/**
 * Service for GraphQL API operations.
 *
 * Centralizes all GraphQL queries and mutations, keeping components
 * focused on presentation logic. Handles HTTP communication and
 * response transformation.
 */
@Injectable({
  providedIn: 'root',
})
export class GraphqlService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = ENVIRONMENT.baseUrl + '/gql';
  private readonly headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  private readonly queries = {
    getDocs: `
      query GetApiData {
        docs
      }
    `,
  };

  private readonly mutations = {
    sendLocalizedNotification: `
      mutation SendLocalizedNotification($notificationId: String!, $params: String) {
        sendLocalizedNotification(notificationId: $notificationId, params: $params) {
          success
          message
        }
      }
    `,
  };

  /**
   * Fetches API documentation from the GraphQL endpoint.
   * @returns Observable that emits the documentation markdown string
   */
  fetchDocs(): Observable<string> {
    return this.http.post<GraphQLDocsResponse>(
      this.endpoint,
      { query: this.queries.getDocs },
      { headers: this.headers }
    ).pipe(
      map(response => response?.data?.docs ?? '')
    );
  }

  /**
   * Sends a localized notification via the server.
   * The server broadcasts to all connected clients with appropriate language variants.
   * @param notificationId - The ID of the predefined notification to send
   * @param params - Optional parameters for the notification (will be JSON stringified)
   * @returns Observable that emits the result of the operation
   */
  sendLocalizedNotification(notificationId: string, params?: Record<string, unknown>): Observable<NotificationResult> {
    return this.http.post<SendNotificationResponse>(
      this.endpoint,
      {
        query: this.mutations.sendLocalizedNotification,
        variables: {
          notificationId,
          params: params ? JSON.stringify(params) : undefined
        }
      },
      { headers: this.headers }
    ).pipe(
      map(response => ({
        success: response?.data?.sendLocalizedNotification?.success ?? false,
        message: response?.data?.sendLocalizedNotification?.message ?? 'Unknown error'
      }))
    );
  }
}
