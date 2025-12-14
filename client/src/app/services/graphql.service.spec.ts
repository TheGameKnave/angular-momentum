import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { GraphqlService, GraphQLDocsResponse, SendNotificationResponse } from './graphql.service';
import { ENVIRONMENT } from 'src/environments/environment';

describe('GraphqlService', () => {
  let service: GraphqlService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GraphqlService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });
    service = TestBed.inject(GraphqlService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('fetchDocs', () => {
    it('should fetch and return documentation', () => {
      const mockResponse: GraphQLDocsResponse = {
        data: { docs: '# API Documentation\n\nSample content' }
      };

      service.fetchDocs().subscribe(docs => {
        expect(docs).toBe('# API Documentation\n\nSample content');
      });

      const req = httpMock.expectOne(ENVIRONMENT.baseUrl + '/gql');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.query).toContain('GetApiData');
      req.flush(mockResponse);
    });

    it('should return empty string when docs is null', () => {
      const mockResponse = { data: { docs: null } } as unknown as GraphQLDocsResponse;

      service.fetchDocs().subscribe(docs => {
        expect(docs).toBe('');
      });

      const req = httpMock.expectOne(ENVIRONMENT.baseUrl + '/gql');
      req.flush(mockResponse);
    });

    it('should return empty string when data is null', () => {
      const mockResponse = { data: null } as unknown as GraphQLDocsResponse;

      service.fetchDocs().subscribe(docs => {
        expect(docs).toBe('');
      });

      const req = httpMock.expectOne(ENVIRONMENT.baseUrl + '/gql');
      req.flush(mockResponse);
    });
  });

  describe('sendLocalizedNotification', () => {
    it('should send notification without params', () => {
      const mockResponse: SendNotificationResponse = {
        data: {
          sendLocalizedNotification: {
            success: true,
            message: 'Notification sent'
          }
        }
      };

      service.sendLocalizedNotification('welcome').subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.message).toBe('Notification sent');
      });

      const req = httpMock.expectOne(ENVIRONMENT.baseUrl + '/gql');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.query).toContain('SendLocalizedNotification');
      expect(req.request.body.variables.notificationId).toBe('welcome');
      expect(req.request.body.variables.params).toBeUndefined();
      req.flush(mockResponse);
    });

    it('should send notification with params', () => {
      const mockResponse: SendNotificationResponse = {
        data: {
          sendLocalizedNotification: {
            success: true,
            message: 'Notification sent'
          }
        }
      };

      const params = { time: '2024-01-01T12:00:00Z' };
      service.sendLocalizedNotification('maintenance', params).subscribe(result => {
        expect(result.success).toBe(true);
      });

      const req = httpMock.expectOne(ENVIRONMENT.baseUrl + '/gql');
      expect(req.request.body.variables.params).toBe(JSON.stringify(params));
      req.flush(mockResponse);
    });

    it('should handle failure response', () => {
      const mockResponse: SendNotificationResponse = {
        data: {
          sendLocalizedNotification: {
            success: false,
            message: 'Permission denied'
          }
        }
      };

      service.sendLocalizedNotification('welcome').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.message).toBe('Permission denied');
      });

      const req = httpMock.expectOne(ENVIRONMENT.baseUrl + '/gql');
      req.flush(mockResponse);
    });

    it('should handle null response gracefully', () => {
      const mockResponse = { data: null } as unknown as SendNotificationResponse;

      service.sendLocalizedNotification('welcome').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.message).toBe('Unknown error');
      });

      const req = httpMock.expectOne(ENVIRONMENT.baseUrl + '/gql');
      req.flush(mockResponse);
    });
  });
});
