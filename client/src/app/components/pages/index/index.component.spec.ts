import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { By } from '@angular/platform-browser';
import { IndexComponent } from './index.component';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { MarkdownModule } from 'ngx-markdown';
import { SecurityContext } from '@angular/core';

describe('IndexComponent', () => {
  let component: IndexComponent;
  let fixture: ComponentFixture<IndexComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [
        IndexComponent,
        RouterModule.forRoot([]),
        getTranslocoModule(), // should return preloaded English translation
        MarkdownModule.forRoot({ sanitize: SecurityContext.STYLE }),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IndexComponent);
    component = fixture.componentInstance;
  }));

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render the correct English title from transloco', async () => {
    fixture.detectChanges();
    await fixture.whenStable(); // Wait for signals and markdown rendering

    const markdownElement = fixture.debugElement.query(By.css('markdown'));
    expect(markdownElement.nativeElement.innerHTML).toContain('<p>This project is designed to rapidly spin up Angular applications');
  });
});
