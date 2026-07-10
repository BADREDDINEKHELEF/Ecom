export const CONFIG = {
  baseUrl: __ENV.TARGET_URL || 'http://localhost:3000',
  apiToken: __ENV.API_TOKEN || 'test-staging-token',
  testPhone: '0555123456',
  testEmail: 'load-test@example.com',
};

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${CONFIG.apiToken}`,
};
