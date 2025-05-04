import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnvironmentComponent } from './environment.component';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';

describe('EnvironmentComponent', () => {
  let component: EnvironmentComponent;
  let fixture: ComponentFixture<EnvironmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        EnvironmentComponent,
        getTranslocoModule(),
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EnvironmentComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});