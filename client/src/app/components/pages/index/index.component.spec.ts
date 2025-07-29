import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { IndexComponent } from './index.component';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { MarkdownModule } from 'ngx-markdown';
import { SecurityContext } from '@angular/core';

describe('IndexComponent', () => {
  let component: IndexComponent;
  let fixture: ComponentFixture<IndexComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        IndexComponent,
        RouterModule.forRoot([]),
        getTranslocoModule(),
        MarkdownModule.forRoot({ sanitize: SecurityContext.STYLE }),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IndexComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should provide the correct markdown content from the signal', () => {
    const value = component.data(); // Access the signal value
    expect(value).toContain('# Angular Momentum');
    expect(value).toContain('This project is designed');
  });

  it('should render the translated markdown content', () => {
    fixture.detectChanges();
    const markdownElement: HTMLElement = fixture.nativeElement.querySelector('#container markdown');
    expect(markdownElement.textContent).toContain('Angular Momentum');
  });
});
