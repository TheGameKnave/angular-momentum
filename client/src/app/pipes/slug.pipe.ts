// client/src/app/pipes/slug.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'slug'
})
export class SlugPipe implements PipeTransform {
  transform(value: string): string {
    return value.toLowerCase().replace(/^(?:[^a-z0-9]+)|(?:[^a-z0-9]+)$/g, '').replace(/[^a-z0-9]+/gi, '-');
  }
}