import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GraphqlApiComponent } from './graphql-api.component';
import { of, throwError } from 'rxjs';
import { getTranslocoModule } from '../../../../../../tests/helpers/transloco-testing.module';
import { GraphqlService } from '@app/services/graphql.service';

describe('GraphqlApiComponent', () => {
  let component: GraphqlApiComponent;
  let fixture: ComponentFixture<GraphqlApiComponent>;
  let graphqlServiceSpy: jasmine.SpyObj<GraphqlService>;

  beforeEach(async () => {
    graphqlServiceSpy = jasmine.createSpyObj('GraphqlService', ['fetchDocs']);
    graphqlServiceSpy.fetchDocs.and.returnValue(of(''));

    await TestBed.configureTestingModule({
      imports: [
        GraphqlApiComponent,
        getTranslocoModule(),
      ],
      providers: [
        { provide: GraphqlService, useValue: graphqlServiceSpy },
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
    graphqlServiceSpy.fetchDocs.and.returnValue(of('Sample docs content'));

    component.ngOnInit();

    expect(graphqlServiceSpy.fetchDocs).toHaveBeenCalled();
    expect(component.docs()).toBe('Sample docs content');
    expect(component.error()).toBe(false);
  });

  it('should set error when response has no docs', () => {
    graphqlServiceSpy.fetchDocs.and.returnValue(of(''));

    component.ngOnInit();

    expect(component.error()).toBe(true);
  });

  it('should handle errors and set error signal', () => {
    graphqlServiceSpy.fetchDocs.and.returnValue(throwError(() => new Error('Network error')));

    component.ngOnInit();

    expect(component.error()).toBe(true);
  });
});
