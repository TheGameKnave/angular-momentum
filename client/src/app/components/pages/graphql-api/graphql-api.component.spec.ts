import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GraphqlApiComponent, GraphQLDocsResponse } from './graphql-api.component';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { FeatureMonitorService } from '@app/services/feature-monitor.service';
import { getTranslocoModule } from '../../../../../../tests/helpers/transloco-testing.module';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ENVIRONMENT } from 'src/environments/environment';

describe('GraphqlApiComponent', () => {
  let component: GraphqlApiComponent;
  let fixture: ComponentFixture<GraphqlApiComponent>;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;

  beforeEach(async () => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['post']);

    await TestBed.configureTestingModule({
      imports: [
        GraphqlApiComponent,
        getTranslocoModule(),
      ],
      providers: [
        { provide: HttpClient, useValue: httpClientSpy },
        { provide: FeatureMonitorService, useValue: jasmine.createSpyObj('FeatureMonitorService', ['']) },
        { provide: ENVIRONMENT, useValue: { baseUrl: 'http://test' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GraphqlApiComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty docs and no error', () => {
    expect(component.docs()).toBe('');
    expect(component.error()).toBe(false);
  });

  it('should fetch API docs on init and set docs signal', () => {
    const mockResponse: GraphQLDocsResponse = { data: { docs: 'Sample docs content' } };
    httpClientSpy.post.and.returnValue(of(mockResponse));

    component.ngOnInit();

    expect(httpClientSpy.post).toHaveBeenCalled();
    expect(component.docs()).toBe('Sample docs content');
    expect(component.error()).toBe(false);
  });

  it('should set error when response has no docs', () => {
    const mockResponse: GraphQLDocsResponse = { data: { docs: '' } };
    httpClientSpy.post.and.returnValue(of(mockResponse));

    component.ngOnInit();

    expect(component.error()).toBe(true);
  });

  it('should handle HTTP errors and set error signal', () => {
    httpClientSpy.post.and.returnValue(throwError(() => new Error('Network error')));

    component.ngOnInit();

    expect(component.error()).toBe(true);
  });
});
