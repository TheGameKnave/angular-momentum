import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';

import { By } from '@angular/platform-browser';
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

  it('should have the correct english title', () => {
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('h1')).nativeElement.innerText).toBe('Angular Momentum');
  });
});
