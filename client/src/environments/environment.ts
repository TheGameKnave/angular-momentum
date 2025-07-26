// Function to get the base URL from the current location
function getBaseUrl(): string {
  const { protocol, hostname, port } = window.location;
  return `${protocol}//${hostname}${port ? ':' + port : ''}`;
}

export const ENVIRONMENT = {
  baseUrl: getBaseUrl(),
  env: 'development',
};
