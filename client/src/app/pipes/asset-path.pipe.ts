import { Pipe, PipeTransform, Injectable } from '@angular/core';
import { ENVIRONMENT } from 'src/environments/environment';

@Pipe({
  name: 'assetPath',
  pure: true
})
@Injectable({ providedIn: 'root' })
export class AssetPathPipe implements PipeTransform {

  transform(filename: string): string {
    return `${ENVIRONMENT.assetBasePath}/${filename}`;
  }
}