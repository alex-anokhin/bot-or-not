# 🤖 Bot or Not

A social deduction game where humans try to identify the AI player among them.

## Features

- **Real-time multiplayer** (4-6 players)
- **AI integration** using OpenAI API
- **WebSocket support** for live updates
- **Mobile-friendly** responsive design
- **Docker deployment** ready

## Quick Start with Docker

### Prerequisites

- Docker and Docker Compose
- OpenAI API key

### Setup

1. **Clone and setup environment:**
```bash
git clone <your-repo-url>
cd bot-or-not
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

2. **Run with Docker Compose:**
```bash
# Production mode
docker-compose up -d

# Development mode (with hot reload)
docker-compose -f docker-compose.dev.yml up
```

3. **Access the game:**
Open http://localhost:8000 in your browser

## Local Development with uv

### Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) package manager

### Setup

1. **Install uv:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

2. **Install dependencies:**
```bash
uv sync
```

3. **Run the application:**
```bash
uv run uvicorn main:app --reload
```

## Game Rules

1. **Players:** 4-6 total (humans + 1 AI)
2. **Objective:** Humans identify and eliminate AI before final 2
3. **Rounds:** Response phase (60s) → Voting phase (60s)
4. **Win Conditions:**
   - Humans win: AI eliminated
   - AI wins: Survives to final 2

## Docker Commands

```bash
# Build and start
docker-compose up --build

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Development with hot reload
docker-compose -f docker-compose.dev.yml up

# Scale for load testing (if Redis enabled)
docker-compose up --scale bot-or-not=3
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | - | OpenAI API key for AI responses |
| `ENVIRONMENT` | No | development | Environment mode |
| `PORT` | No | 8000 | Server port |
| `HOST` | No | 0.0.0.0 | Server host |

## API Endpoints

- `GET /` - Game interface
- `POST /create-room` - Create new game room
- `POST /join-room` - Join existing room
- `POST /start-game` - Start game
- `POST /submit-response` - Submit response
- `POST /submit-vote` - Submit vote
- `WS /ws/{room_id}/{player_id}` - WebSocket connection

## Project Structure

```
bot-or-not/
├── main.py              # FastAPI application
├── game_logic.py        # Game state management
├── ai_bot.py           # AI integration
├── static/             # Frontend files
│   ├── index.html
│   ├── style.css
│   └── script.js
├── pyproject.toml      # uv configuration
├── Dockerfile          # Container configuration
├── docker-compose.yml  # Production deployment
└── .env.example       # Environment template
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Test with `docker-compose -f docker-compose.dev.yml up`
5. Submit a pull request

## License

MIT License - see LICENSE file for details
