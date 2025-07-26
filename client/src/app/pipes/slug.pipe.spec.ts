import { SlugPipe } from '@app/pipes/slug.pipe';

describe('SlugPipe', () => {
  it('create an instance', () => {
    const pipe = new SlugPipe();
    expect(pipe).toBeTruthy();
  });
  it('should transform a string into a slug', () => {
    const pipe = new SlugPipe();
    const input = 'Hello World';
    const expectedOutput = 'hello-world';
    expect(pipe.transform(input)).toEqual(expectedOutput);
  });
  it('should handle empty strings', () => {
    const pipe = new SlugPipe();
    const input = '';
    const expectedOutput = '';
    expect(pipe.transform(input)).toEqual(expectedOutput);
  });
  it('should handle strings with special characters', () => {
    const pipe = new SlugPipe();
    const input = 'Hello@World!';
    const expectedOutput = 'hello-world';
    expect(pipe.transform(input)).toEqual(expectedOutput);
  });
  it('should handle strings with multiple spaces', () => {
    const pipe = new SlugPipe();
    const input = 'Hello   World';
    const expectedOutput = 'hello-world';
    expect(pipe.transform(input)).toEqual(expectedOutput);
  });
});
