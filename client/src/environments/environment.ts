export const ENVIRONMENT = {
  env: 'development',
  baseUrl: typeof window !== 'undefined' ? window.location.origin : /* istanbul ignore next - SSR fallback */ 'http://localhost:4201',
  supabase: {
    url: 'https://tyoyznpjxppchdyydbnf.supabase.co',
    publicKey: 'sb_publishable_35dVvVIWwou5S-E9MgV4pA_FkK2eOdZ',
  },
};
