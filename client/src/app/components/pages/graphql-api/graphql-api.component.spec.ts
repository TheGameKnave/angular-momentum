import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GraphqlApiComponent } from './graphql-api.component';
import { ChangeDetectorRef, SecurityContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHandler } from '@angular/common/http';
import { of } from 'rxjs';
import { throwError } from 'rxjs';
import { MarkdownModule } from 'ngx-markdown';

describe('GraphqlApiComponent', () => {
  let component: GraphqlApiComponent;
  let fixture: ComponentFixture<GraphqlApiComponent>;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;

  beforeEach(async () => {
    // Create the spy for `post()` instead of `get()`
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['post']);

    await TestBed.configureTestingModule({
      imports: [
        GraphqlApiComponent,
        MarkdownModule.forRoot({ sanitize: SecurityContext.STYLE }),
      ],
      providers: [
        { provide: HttpClient, useValue: httpClientSpy },
        { provide: HttpHandler, useValue: {} },
        ChangeDetectorRef,
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GraphqlApiComponent);
    component = fixture.componentInstance;
    TestBed.inject(HttpHandler);
    TestBed.inject(HttpClient);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be created', () => {
    expect(fixture).toBeTruthy();
  });

  it('should make a POST request to the GraphQL API', () => {
    // Mock response for GraphQL API
    httpClientSpy.post.and.returnValue(of({ data: { docs: ['Sample documentation'] } }));

    component.ngOnInit();
    
    expect(httpClientSpy.post).toHaveBeenCalledTimes(1);
    expect(httpClientSpy.post.calls.argsFor(0)[0]).toBe('/api');
  });

  it('should display the API data', () => {
    const data = { data: { docs: 'Sample documentation' } };
    httpClientSpy.post.and.returnValue(of(data));
    component.ngOnInit();
    fixture.detectChanges();
    expect(component.results).toBe(data);
  });

  it('should handle API errors', () => {
    const error = { message: 'Error message' };
    httpClientSpy.post.and.returnValue(throwError(() => error));
    component.ngOnInit();
    fixture.detectChanges();
    expect(component.error).toEqual(error);
  });
});
