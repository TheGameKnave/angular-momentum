import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';

import { By } from '@angular/platform-browser';
import { IndexPage } from './index.page';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';
import { MarkdownModule } from 'ngx-markdown';
import { SecurityContext } from '@angular/core';

describe('IndexPage', () => {
  let component: IndexPage;
  let fixture: ComponentFixture<IndexPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        IndexPage,
        RouterModule.forRoot([]),
        getTranslocoModule(),
        MarkdownModule.forRoot({ sanitize: SecurityContext.STYLE }),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IndexPage);
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
