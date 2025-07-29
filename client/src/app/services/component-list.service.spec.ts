import { TestBed } from '@angular/core/testing';

import { ComponentListService } from '@app/services/component-list.service';

describe('ComponentListService', () => {
  let service: ComponentListService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ComponentListService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});