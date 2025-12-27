import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MenuCloseDirective } from './menu-close.directive';
import { DialogMenuComponent } from '@app/components/menus/dialog-menu/dialog-menu.component';

@Component({
  template: `<button appMenuClose>Close</button>`,
  imports: [MenuCloseDirective],
})
class TestHostComponent {}

describe('MenuCloseDirective', () => {
  describe('without DialogMenuComponent', () => {
    let fixture: ComponentFixture<TestHostComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TestHostComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(TestHostComponent);
      fixture.detectChanges();
    });

    it('should create directive', () => {
      const directiveEl = fixture.debugElement.query(By.directive(MenuCloseDirective));
      expect(directiveEl).toBeTruthy();
    });

    it('should not throw when clicked without parent menu', () => {
      const button = fixture.nativeElement.querySelector('button');
      expect(() => button.click()).not.toThrow();
    });

    it('should not throw on Enter key without parent menu', () => {
      const button = fixture.nativeElement.querySelector('button');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      expect(() => button.dispatchEvent(event)).not.toThrow();
    });
  });

  describe('with DialogMenuComponent', () => {
    let fixture: ComponentFixture<TestHostComponent>;
    let mockMenu: jasmine.SpyObj<DialogMenuComponent>;

    beforeEach(async () => {
      mockMenu = jasmine.createSpyObj('DialogMenuComponent', ['close']);

      await TestBed.configureTestingModule({
        imports: [TestHostComponent],
        providers: [
          { provide: DialogMenuComponent, useValue: mockMenu },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(TestHostComponent);
      fixture.detectChanges();
    });

    it('should close menu on click', () => {
      const button = fixture.nativeElement.querySelector('button');
      button.click();
      expect(mockMenu.close).toHaveBeenCalled();
    });

    it('should close menu on Enter key', () => {
      const button = fixture.nativeElement.querySelector('button');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      button.dispatchEvent(event);
      expect(mockMenu.close).toHaveBeenCalled();
    });
  });
});
