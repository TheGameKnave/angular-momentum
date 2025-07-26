import { Subscription } from 'rxjs';
import { AutoUnsubscribe } from '@app/helpers/unsub';

describe('AutoUnsubscribe Decorator', () => {
  let originalSetTimeout: typeof setTimeout;

  beforeEach(() => {
    // Mock setTimeout and store the original implementation
    originalSetTimeout = window.setTimeout;
    (window as any).setTimeout = (handler: (...args: any[]) => void, timeout?: number) => {
      handler(); // Immediately execute the callback
      return 0; // Return a dummy timer ID
    };
  });

  afterEach(() => {
    // Restore original setTimeout implementation
    (window as any).setTimeout = originalSetTimeout;
  });

  it('should unsubscribe from subscriptions and clear objects on component destroy', () => {
    // Create a test component with the AutoUnsubscribe decorator applied
    @AutoUnsubscribe()
    class TestComponent {
      subscription1 = jasmine.createSpyObj('subscription1', ['unsubscribe']);
      subscription2 = jasmine.createSpyObj('subscription2', ['unsubscribe']);
      prop1: any = {};
      prop2: any = {};
      prop3: string = '';

      // Mock ngOnDestroy lifecycle hook
      ngOnDestroy() {}
    }
    
    // Create an instance of the TestComponent
    const testComponent = new TestComponent();

    // Call the ngOnDestroy method
    testComponent.ngOnDestroy();

    // Expectations
    expect(testComponent.subscription1.unsubscribe).toHaveBeenCalled();
    expect(testComponent.subscription2.unsubscribe).toHaveBeenCalled();
    expect(testComponent.prop1).toBeNull();
    expect(testComponent.prop2).toBeNull();
    expect(testComponent.prop3).toBe('');
  });
});