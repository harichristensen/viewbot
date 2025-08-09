const AnalyticsService = require('../../../../src/engine/analytics/analyticsService');
const db = require('../../../../../shared/database/models');

// Mock the database models
jest.mock('../../../../../shared/database/models', () => ({
  Post: {
    findByPk: jest.fn(),
    update: jest.fn()
  },
  User: {
    findAll: jest.fn()
  },
  View: {
    bulkCreate: jest.fn()
  },
  Like: {
    findAll: jest.fn(),
    bulkCreate: jest.fn()
  },
  AnalyticsEntry: {
    create: jest.fn()
  },
  sequelize: {
    transaction: jest.fn(),
    Op: {
      notIn: 'notIn'
    }
  },
  Sequelize: {
    Op: {
      notIn: 'notIn'
    }
  }
}));

describe('AnalyticsService Tests', () => {
  let analyticsService;
  let mockPost;
  let mockTransaction;

  beforeEach(() => {
    jest.clearAllMocks();
    
    analyticsService = new AnalyticsService();
    
    mockPost = global.testHelpers.createMockPost({
      viewCount: 100,
      likeCount: 5,
      commentCount: 2,
      shareCount: 1,
      update: jest.fn()
    });

    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn()
    };

    db.sequelize.transaction.mockResolvedValue(mockTransaction);
    db.Post.findByPk.mockResolvedValue(mockPost);
  });

  describe('startViralSimulation', () => {
    it('should start a simulation successfully', async () => {
      const config = {
        targetMediaId: 1,
        maxViews: 10000,
        maxLikes: 500,
        likeRatio: 0.05,
        growthDurationHours: 72
      };

      const result = await analyticsService.startViralSimulation(config);

      expect(result.success).toBe(true);
      expect(result.simulation).toBeDefined();
      expect(analyticsService.activeSimulations.has(1)).toBe(true);
    });

    it('should throw error if target media not found', async () => {
      db.Post.findByPk.mockResolvedValue(null);

      const config = {
        targetMediaId: 999,
        maxViews: 10000,
        maxLikes: 500
      };

      await expect(analyticsService.startViralSimulation(config))
        .rejects.toThrow('Target media 999 not found');
    });
  });

  describe('updateSingleSimulation', () => {
    const simulation = {
      maxViews: 1000,
      maxLikes: 50,
      likeRatio: 0.05,
      growthDurationHours: 72,
      growthCurve: 'sigmoid',
      startTime: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      initialViews: 100,
      initialLikes: 5
    };

    it('should update views and likes based on growth curve', async () => {
      const result = await analyticsService.updateSingleSimulation(1, simulation);

      expect(result.success).toBe(true);
      expect(result.isComplete).toBe(false);
      expect(result.currentViews).toBeGreaterThan(simulation.initialViews);
      expect(result.currentLikes).toBeGreaterThan(simulation.initialLikes);
    });

    it('should mark simulation as complete when duration reached', async () => {
      const oldSimulation = {
        ...simulation,
        startTime: new Date(Date.now() - 73 * 60 * 60 * 1000) // 73 hours ago
      };

      const result = await analyticsService.updateSingleSimulation(1, oldSimulation);

      expect(result.success).toBe(true);
      expect(result.isComplete).toBe(true);
      expect(result.message).toBe('Simulation duration reached');
    });

    it('should handle post not found', async () => {
      db.Post.findByPk.mockResolvedValue(null);

      await expect(analyticsService.updateSingleSimulation(999, simulation))
        .rejects.toThrow('Post 999 not found');
    });
  });

  describe('shuffleArray', () => {
    it('should shuffle array without losing elements', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = analyticsService.shuffleArray(original);

      expect(shuffled.length).toBe(original.length);
      expect(shuffled.sort()).toEqual(original.sort());
    });

    it('should not modify the original array', () => {
      const original = [1, 2, 3, 4, 5];
      const originalCopy = [...original];
      analyticsService.shuffleArray(original);

      expect(original).toEqual(originalCopy);
    });
  });

  describe('generateSyntheticViews', () => {
    beforeEach(() => {
      db.User.findAll.mockResolvedValue([
        { id: 1 },
        { id: 2 },
        { id: 3 }
      ]);
    });

    it('should generate view records for bot users', async () => {
      await analyticsService.generateSyntheticViews(1, 5, mockTransaction);

      expect(db.User.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isBot: true },
          attributes: ['id'],
          transaction: mockTransaction
        })
      );

      expect(db.View.bulkCreate).toHaveBeenCalled();
      const viewRecords = db.View.bulkCreate.mock.calls[0][0];
      expect(viewRecords.length).toBe(5);
      expect(viewRecords[0]).toHaveProperty('postId', 1);
      expect(viewRecords[0]).toHaveProperty('userId');
      expect(viewRecords[0]).toHaveProperty('ipAddress');
    });
  });

  describe('getAllSimulations', () => {
    it('should return all active simulations with status', () => {
      const sim1 = {
        targetMediaId: 1,
        maxViews: 1000,
        startTime: new Date(),
        growthDurationHours: 72
      };
      const sim2 = {
        targetMediaId: 2,
        maxViews: 2000,
        startTime: new Date(),
        growthDurationHours: 48
      };

      analyticsService.activeSimulations.set(1, sim1);
      analyticsService.activeSimulations.set(2, sim2);

      const simulations = analyticsService.getAllSimulations();

      expect(simulations.length).toBe(2);
      expect(simulations[0]).toHaveProperty('isActive', true);
      expect(simulations[0]).toHaveProperty('progress');
      expect(simulations[0]).toHaveProperty('elapsedHours');
    });
  });
});