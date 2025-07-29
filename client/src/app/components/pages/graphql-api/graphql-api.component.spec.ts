import { TestBed } from '@angular/core/testing';
import { GraphqlApiComponent, InitializeApiRes } from './graphql-api.component';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { MarkdownModule } from 'ngx-markdown';
import { SecurityContext } from '@angular/core';

describe('GraphqlApiComponent', () => {
  let component: GraphqlApiComponent;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;

  beforeEach(async () => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['post']);

    await TestBed.configureTestingModule({
      imports: [GraphqlApiComponent, MarkdownModule.forRoot({ sanitize: SecurityContext.STYLE })],
      providers: [{ provide: HttpClient, useValue: httpClientSpy }],
    }).compileComponents();

    const fixture = TestBed.createComponent(GraphqlApiComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should make a POST request and emit API data on results$', (done) => {
    const mockResponse: InitializeApiRes = { data: { docs: 'Sample docs' } };
    httpClientSpy.post.and.returnValue(of(mockResponse));

    component.ngOnInit();  // <---- IMPORTANT: call lifecycle hook!

    component.results$.subscribe((res) => {
      expect(res).toEqual(mockResponse);
      expect(httpClientSpy.post).toHaveBeenCalledWith(
        'http://localhost:4200/api',
        { query: `
query GetApiData {
  docs
}
` },
        jasmine.any(Object) // headers object
      );
      done();
    });
  });

  it('should set error and emit null when HTTP POST fails', (done) => {
    const mockError = new Error('Network error');
    httpClientSpy.post.and.returnValue(throwError(() => mockError));

    component.ngOnInit();  // <---- call lifecycle hook

    component.results$.subscribe((res) => {
      expect(res).toBeNull();
      expect(component.error).toEqual(mockError); // use .toEqual, not .toBe
      done();
    });
  });
});
