// client/src/app/pipes/slug.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'slug'
})
export class SlugPipe implements PipeTransform {
  transform(value: string): string {
    return encodeURIComponent(value.toLowerCase().replace(/ /g, '-'));
  }
}