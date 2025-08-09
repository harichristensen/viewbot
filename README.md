# ViewBot - Bot Simulation System

A sophisticated bot simulation system designed to simulate user activity and viral content growth patterns. Built using the subdomain architecture pattern for better separation of concerns and scalability.

## Architecture Overview

The system follows a **subdomain deployment strategy** with:
- Main application at `app.viewbot.com`
- Bot management system at `bot.viewbot.com`
- Shared database and infrastructure
- Docker Compose orchestration

## Features

### 🤖 Bot User Management
- Automated creation of 50+ bot users with realistic profiles
- Human-like behavior simulation
- Configurable posting patterns

### 📈 Viral Growth Simulation
- S-curve (sigmoid) growth patterns
- Configurable target metrics (views, likes)
- Real-time analytics tracking
- Synthetic view/like generation

### 📅 Smart Scheduling
- Time-based activity patterns
- Human-like posting probability
- Daily post limits
- Active hours configuration

### 📊 Dashboard Interface
- Real-time statistics monitoring
- Simulation control panel
- Configuration management
- Performance metrics

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 14+ (handled by Docker)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd viewbot
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the services**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**
   ```bash
   docker-compose run migrate
   ```

5. **Seed bot users**
   ```bash
   npm run seed
   # or
   docker-compose exec bot node /app/scripts/seedBotUsers.js
   ```

### Accessing the System

- **Main Application**: http://app.viewbot.com (configure in hosts file)
- **Bot Dashboard**: http://bot.viewbot.com/dashboard
- **MinIO Console**: http://localhost:9001

## Project Structure

```
viewbot/
├── app/                    # Main application
├── bot/                    # Bot system
│   ├── src/
│   │   ├── api/           # REST API endpoints
│   │   ├── engine/        # Core bot logic
│   │   │   ├── posting/   # Content posting engine
│   │   │   └── analytics/ # Viral simulation engine
│   │   └── utils/         # Utilities
│   └── public/
│       └── dashboard/     # Admin dashboard UI
├── shared/                 # Shared code
│   ├── database/          # Database models & migrations
│   └── lib/               # Shared libraries
├── scripts/               # Utility scripts
├── bot-media/            # Media files for bot posts
└── docker-compose.yml    # Docker orchestration
```

## Bot Configuration

### Posting Configuration
```json
{
  "minPostsPerDay": 5,
  "maxPostsPerDay": 20,
  "activeHours": { "start": 6, "end": 23 },
  "mediaTypes": ["video", "image"],
  "postingProbability": 0.7
}
```

### Analytics Configuration
```json
{
  "targetMediaId": 123,
  "maxViews": 100000,
  "maxLikes": 5000,
  "likeRatio": 0.05,
  "growthDurationHours": 72,
  "growthCurve": "sigmoid"
}
```

## API Endpoints

### Scheduler Control
- `GET /api/scheduler/status` - Get scheduler status
- `POST /api/scheduler/start` - Start scheduler
- `POST /api/scheduler/stop` - Stop scheduler
- `POST /api/scheduler/reload` - Reload configuration

### Simulation Management
- `GET /api/simulation` - List active simulations
- `POST /api/simulation/start` - Start new simulation
- `POST /api/simulation/:id/stop` - Stop simulation
- `GET /api/simulation/history/:id` - Get simulation history

### Configuration
- `GET /api/config` - List configurations
- `POST /api/config` - Create configuration
- `PUT /api/config/:id` - Update configuration
- `DELETE /api/config/:id` - Delete configuration

### Statistics
- `GET /api/stats/activity` - Bot activity stats
- `GET /api/stats/users` - Bot user statistics
- `GET /api/stats/performance` - System performance
- `GET /api/stats/realtime` - Real-time metrics

## Development

### Running Locally

1. **Install dependencies**
   ```bash
   npm install
   cd bot && npm install
   cd ../app && npm install
   ```

2. **Start services**
   ```bash
   # Terminal 1: Start infrastructure
   docker-compose up postgres redis minio
   
   # Terminal 2: Start bot system
   cd bot && npm run dev
   
   # Terminal 3: Start main app (if needed)
   cd app && npm run dev
   ```

### Adding Media Files

Place media files in the `bot-media/` directory:
```
bot-media/
├── videos/
│   └── sample1.mp4
└── images/
    └── sample1.jpg
```

## Monitoring & Debugging

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f bot
```

### Database Access
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U viewbot -d viewbot
```

### Performance Monitoring
- Check the dashboard at `/dashboard` for real-time metrics
- Monitor Docker stats: `docker stats`
- Database size and metrics available in performance API

## Security Considerations

1. **Authentication**: Implement proper JWT authentication for production
2. **Rate Limiting**: Configured in Nginx for API endpoints
3. **Environment Variables**: Never commit `.env` files
4. **Database Access**: Use read-only replicas for analytics
5. **Media Storage**: Implement proper access controls for MinIO

## Troubleshooting

### Common Issues

1. **Port conflicts**
   - Check if ports 80, 5432, 6379, 9000, 9001 are available
   - Modify `docker-compose.yml` if needed

2. **Database connection errors**
   - Ensure PostgreSQL is running: `docker-compose ps postgres`
   - Check credentials in `.env` file

3. **Bot users not posting**
   - Verify scheduler is running: Check dashboard
   - Check bot user credentials were created: `npm run seed`
   - Review logs: `docker-compose logs bot`

4. **Simulations not updating**
   - Check analytics worker is running
   - Verify target media exists in database
   - Monitor simulation status in dashboard

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Machine learning for more realistic behavior
- [ ] Advanced analytics and reporting
- [ ] Multi-tenant support
- [ ] Kubernetes deployment manifests
- [ ] Automated testing suite
- [ ] API rate limiting per user
- [ ] Backup and restore procedures

## License

This project is for educational and testing purposes only. Ensure compliance with platform terms of service when deploying.