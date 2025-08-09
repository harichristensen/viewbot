const PostingService = require('../../../../src/engine/posting/postingService');
const axios = require('axios');
const fs = require('fs').promises;

// Mock dependencies
jest.mock('axios');
jest.mock('fs').promises;
jest.mock('../../../../src/utils/auth');
jest.mock('../../../../src/utils/media');

const mockAuth = require('../../../../src/utils/auth');
const mockMedia = require('../../../../src/utils/media');

describe('PostingService Tests', () => {
  let postingService;
  let mockUser;
  let mockMediaFile;

  beforeEach(() => {
    jest.clearAllMocks();
    
    postingService = new PostingService({
      apiBaseUrl: 'http://test.api',
      mediaDir: '/test/media',
      botUserPassword: 'test_password'
    });

    mockUser = global.testHelpers.createMockUser();
    mockMediaFile = {
      path: '/test/media/video.mp4',
      filename: 'video.mp4'
    };

    // Setup default mocks
    mockAuth.getRandomBotUser.mockResolvedValue(mockUser);
    mockAuth.authenticateUser.mockResolvedValue('test_token');
    mockMedia.selectRandomMedia.mockResolvedValue(mockMediaFile);
    mockMedia.getMediaMetadata.mockResolvedValue({
      type: 'video',
      contentType: 'video/mp4',
      duration: 30
    });
  });

  describe('generateTitle', () => {
    it('should generate a non-empty title', () => {
      const title = postingService.generateTitle();
      expect(title).toBeTruthy();
      expect(typeof title).toBe('string');
      expect(title.length).toBeGreaterThan(0);
    });

    it('should generate different titles on multiple calls', () => {
      const titles = new Set();
      for (let i = 0; i < 10; i++) {
        titles.add(postingService.generateTitle());
      }
      // Should generate at least some different titles
      expect(titles.size).toBeGreaterThan(1);
    });
  });

  describe('generateDescription', () => {
    it('should generate description with hashtags', () => {
      const description = postingService.generateDescription();
      expect(description).toBeTruthy();
      expect(description).toMatch(/#\w+/); // Should contain at least one hashtag
    });
  });

  describe('executePosting', () => {
    beforeEach(() => {
      axios.post.mockImplementation((url) => {
        if (url.includes('/media/upload-url')) {
          return Promise.resolve({
            data: {
              uploadUrl: 'http://minio/upload',
              mediaUrl: 'http://minio/video.mp4'
            }
          });
        }
        if (url.includes('/posts')) {
          return Promise.resolve({
            data: { id: 123, title: 'Test Post' }
          });
        }
      });

      axios.put.mockResolvedValue({ data: { success: true } });
      fs.readFile.mockResolvedValue(Buffer.from('fake video data'));
    });

    it('should successfully create a post', async () => {
      const result = await postingService.executePosting();

      expect(result.success).toBe(true);
      expect(result.post).toBeDefined();
      expect(result.post.id).toBe(123);
      expect(result.botUser.username).toBe(mockUser.username);
    });

    it('should handle authentication failure', async () => {
      mockAuth.authenticateUser.mockRejectedValue(new Error('Auth failed'));

      const result = await postingService.executePosting();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Auth failed');
    });

    it('should handle media selection failure', async () => {
      mockMedia.selectRandomMedia.mockRejectedValue(new Error('No media found'));

      const result = await postingService.executePosting();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No media found');
    });
  });

  describe('executeWithHumanBehavior', () => {
    it('should skip posting based on probability', async () => {
      const result = await postingService.executeWithHumanBehavior({
        postingProbability: 0, // Never post
        timeOfDay: 12
      });

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('probability_check');
    });

    it('should respect time-based activity weights', async () => {
      // Mock Math.random to always return a value that would normally trigger posting
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.1);

      const resultMidnight = await postingService.executeWithHumanBehavior({
        postingProbability: 1,
        timeOfDay: 0 // Midnight - low activity
      });

      const resultNoon = await postingService.executeWithHumanBehavior({
        postingProbability: 1,
        timeOfDay: 12 // Noon - high activity
      });

      Math.random = originalRandom;

      // At midnight with low activity weight, posting is less likely
      expect(resultMidnight.skipped).toBe(true);
      // At noon with high activity weight, posting is more likely
      expect(resultNoon.skipped).toBeFalsy();
    });
  });
});