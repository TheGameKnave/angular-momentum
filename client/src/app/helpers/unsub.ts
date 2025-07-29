export function AutoUnsubscribe( ) {
  return function ( constructor: any ) {
    const original = constructor.prototype.ngOnDestroy;

    constructor.prototype.ngOnDestroy = function () {
      for ( const prop in this ) {
        const property = this[ prop ];
        if ( property && ( typeof property.unsubscribe === "function" ) ) {
          property.unsubscribe();
        }else if(typeof property === 'object'){
          this[prop] = null; // TODO remove this band-aid when we determine components are properly released
        }
      }
      original && typeof original === 'function' && original.apply(this, arguments);
    };
  }
}
