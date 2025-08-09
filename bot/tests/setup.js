// Test environment setup
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'viewbot_test';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.BOT_USER_PASSWORD = 'test_bot_password';
process.env.MAIN_APP_API = 'http://localhost:3000/api';
process.env.BOT_MEDIA_DIR = './tests/fixtures/media';

// Mock winston logger to reduce noise in tests
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Global test utilities
global.testHelpers = {
  // Create a mock user
  createMockUser: (overrides = {}) => ({
    id: 1,
    username: 'test_bot_user',
    email: 'test@bot.local',
    displayName: 'Test Bot',
    isBot: true,
    isActive: true,
    ...overrides
  }),

  // Create a mock post
  createMockPost: (overrides = {}) => ({
    id: 1,
    userId: 1,
    title: 'Test Post',
    description: 'Test Description',
    mediaType: 'video',
    mediaUrl: 'http://minio:9000/test.mp4',
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    ...overrides
  }),

  // Mock axios responses
  mockAxiosResponse: (data, status = 200) => ({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {}
  })
};

// Clean up after all tests
afterAll(async () => {
  // Close database connections
  const db = require('../../shared/database/models');
  if (db.sequelize) {
    await db.sequelize.close();
  }
});