// client/src/app/pipes/slug.pipe.ts
import { Injectable, Pipe, PipeTransform } from '@angular/core';

@Injectable()
@Pipe({
  name: 'slug'
})
export class SlugPipe implements PipeTransform {
  transform(value: string): string {
    return value.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '').replace(/[^a-z0-9]+/gi, '-');
  }
}