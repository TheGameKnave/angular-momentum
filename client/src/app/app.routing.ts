import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { componentList } from './app.component';

const routes: Routes = [
  { path: '', redirectTo: 'features', pathMatch: 'full' },
  ...Object.entries(componentList).map(([name, component]) => ({
    path: name.toLowerCase().replace(/\s+/g, '-'),
    component,
  })),
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
