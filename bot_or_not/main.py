from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import json
import asyncio
from typing import Dict, List
import uuid
import logging
import os
import random
from pathlib import Path

from .game_logic import create_room, get_game, cleanup_old_games

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(title="Bot or Not Game", version="1.0.0")

# Get the directory containing this file
BASE_DIR = Path(__file__).parent.parent
STATIC_DIR = BASE_DIR / "static"

# Mount static files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Lazy import AI bot to avoid initialization errors at startup
def get_ai_bot():
    """Get AI bot instance with lazy loading"""
    try:
        from .ai_bot import ai_bot
        return ai_bot
    except Exception as e:
        logger.error(f"Failed to initialize AI bot: {e}")
        return None

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, room_id: str, player_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
        self.active_connections[room_id][player_id] = websocket
        logger.info(f"Player {player_id} connected to room {room_id}")
    
    def disconnect(self, room_id: str, player_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id].pop(player_id, None)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
        logger.info(f"Player {player_id} disconnected from room {room_id}")
    
    async def send_personal_message(self, message: str, room_id: str, player_id: str):
        if room_id in self.active_connections and player_id in self.active_connections[room_id]:
            try:
                await self.active_connections[room_id][player_id].send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to {player_id}: {e}")
    
    async def broadcast_to_room(self, message: str, room_id: str, exclude_player: str = None):
        if room_id in self.active_connections:
            for player_id, connection in self.active_connections[room_id].items():
                if exclude_player and player_id == exclude_player:
                    continue
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to {player_id}: {e}")

manager = ConnectionManager()

# Pydantic models for API requests
class CreateRoomRequest(BaseModel):
    player_name: str

class JoinRoomRequest(BaseModel):
    room_id: str
    player_name: str

class SubmitResponseRequest(BaseModel):
    room_id: str
    player_id: str
    response_text: str

class SubmitVoteRequest(BaseModel):
    room_id: str
    player_id: str
    target_player_id: str
    vote_type: str  # "kick" or "trust"

# API Routes
@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serve the main game page"""
    try:
        index_path = STATIC_DIR / "index.html"
        with open(index_path, "r") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse("<h1>Game files not found. Please check static/ directory.</h1>")

@app.post("/create-room")
async def create_game_room(request: CreateRoomRequest):
    """Create a new game room"""
    room_id = create_room()
    player_id = str(uuid.uuid4())
    
    game = get_game(room_id)
    if not game:
        raise HTTPException(status_code=500, detail="Failed to create room")
    
    success = game.add_player(player_id, request.player_name)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to add player to room")
    
    return {
        "room_id": room_id,
        "player_id": player_id,
        "game_state": game.get_game_state_dict()
    }

@app.post("/join-room") 
async def join_game_room(request: JoinRoomRequest):
    """Join an existing game room"""
    try:
        # Normalize room ID - handle both "room_123456" and "123456" formats
        room_id = request.room_id.strip()
        if not room_id.startswith("room_"):
            # If user just entered the number part, add the prefix
            if room_id.isdigit():
                room_id = f"room_{room_id}"
            else:
                raise HTTPException(status_code=400, detail="Invalid room code format")
        
        game = get_game(room_id)
        if not game:
            logger.warning(f"Room not found: {room_id}")
            raise HTTPException(status_code=404, detail="Room not found")
        
        player_id = str(uuid.uuid4())
        success = game.add_player(player_id, request.player_name)
        
        if not success:
            raise HTTPException(status_code=400, detail="Unable to join room (full or already started)")
        
        logger.info(f"Player {player_id} joined room {room_id}")
        
        # Get game state and ensure it's serializable
        game_state = game.get_game_state_dict()
        
        # Broadcast player joined to room
        await manager.broadcast_to_room(
            json.dumps({
                "type": "player_joined",
                "game_state": game_state
            }),
            room_id
        )
        
        return {
            "room_id": room_id,
            "player_id": player_id,
            "game_state": game_state
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error in join_game_room: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/room/{room_id}")
async def get_room_status(room_id: str):
    """Get current room status"""
    game = get_game(room_id)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
    
    return game.get_game_state_dict()

@app.post("/start-game")
async def start_game(request: dict):
    """Start the game in a room"""
    room_id = request.get("room_id")
    if not room_id:
        raise HTTPException(status_code=400, detail="room_id is required")
    
    game = get_game(room_id)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if not game.can_start_game():
        raise HTTPException(status_code=400, detail="Not enough players to start game")
    
    success = game.start_game()
    if not success:
        raise HTTPException(status_code=400, detail="Unable to start game")
    
    # Broadcast game started
    await manager.broadcast_to_room(
        json.dumps({
            "type": "game_started",
            "game_state": game.get_game_state_dict()
        }),
        room_id
    )
    
    # Generate AI response after a short delay
    asyncio.create_task(generate_ai_response_delayed(room_id))
    
    return {"success": True, "game_state": game.get_game_state_dict()}

@app.post("/submit-response")
async def submit_response(request: SubmitResponseRequest):
    """Submit a response to the current prompt"""
    game = get_game(request.room_id)
    if not game:
        raise HTTPException(status_code=404, detail="Room not found")
    
    success = game.add_response(request.player_id, request.response_text)
    if not success:
        raise HTTPException(status_code=400, detail="Unable to submit response")
    
    # Check if we can advance to voting
    if game.can_advance_to_voting():
        game.start_voting_phase()
        await manager.broadcast_to_room(
            json.dumps({
                "type": "voting_phase_started",
                "game_state": game.get_game_state_dict()
            }),
            request.room_id
        )
        
        # Generate AI vote after delay
        asyncio.create_task(generate_ai_vote_delayed(request.room_id))
    else:
        # Broadcast that response was received
        await manager.broadcast_to_room(
            json.dumps({
                "type": "response_received", 
                "game_state": game.get_game_state_dict()
            }),
            request.room_id
        )
    
    return {"success": True, "game_state": game.get_game_state_dict()}

@app.post("/submit-vote")
async def submit_vote(request: SubmitVoteRequest):
    """Submit a vote for kick/trust"""
    try:
        game = get_game(request.room_id)
        if not game:
            raise HTTPException(status_code=404, detail="Room not found")
        
        success = game.add_vote(request.player_id, request.target_player_id, request.vote_type)
        if not success:
            raise HTTPException(status_code=400, detail="Unable to submit vote")
        
        # Get serializable game state
        game_state = game.get_game_state_dict()
        
        # Check if we can advance to results
        if game.can_advance_to_results():
            results = game.calculate_round_results()
            
            await manager.broadcast_to_room(
                json.dumps({
                    "type": "round_results",
                    "results": results,
                    "game_state": game_state
                }),
                request.room_id
            )
            
            # Check win condition and advance to next round after delay
            asyncio.create_task(advance_round_delayed(request.room_id))
        else:
            # Broadcast that vote was received
            await manager.broadcast_to_room(
                json.dumps({
                    "type": "vote_received",
                    "game_state": game_state
                }),
                request.room_id
            )
        
        return {"success": True, "game_state": game_state}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in submit_vote: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# WebSocket endpoint
@app.websocket("/ws/{room_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, player_id: str):
    await manager.connect(websocket, room_id, player_id)
    
    try:
        while True:
            # Keep connection alive and handle any messages
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle ping messages to keep connection alive
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            
    except WebSocketDisconnect:
        manager.disconnect(room_id, player_id)
        logger.info(f"Player {player_id} disconnected from room {room_id}")

# Background tasks
async def generate_ai_response_delayed(room_id: str):
    """Generate AI response after a short delay to seem more human"""
    await asyncio.sleep(3 + (hash(room_id) % 10))  # 3-13 second delay
    
    game = get_game(room_id)
    if not game or game.phase != "response" or not game.ai_player_id:
        return
    
    try:
        ai_bot = get_ai_bot()
        if not ai_bot:
            logger.error("AI bot not available - using fallback response")
            # Use a simple fallback response
            fallback_responses = [
                "Honestly, that's a tough one... probably something really weird knowing me 😂",
                "Oh man, I'd probably overthink it and end up doing something completely random lol",
                "Classic me would find a way to make this situation even weirder somehow 🤷‍♀️"
            ]
            ai_response = random.choice(fallback_responses)
        else:
            # Get existing responses for context (excluding AI's own if any)
            human_responses = [r for r in game.responses if r["player_id"] != game.ai_player_id]
            ai_response = await ai_bot.generate_response(game.prompt, human_responses)
        
        game.add_response(game.ai_player_id, ai_response)
        
        # Check if we can advance to voting
        if game.can_advance_to_voting():
            game.start_voting_phase()
            await manager.broadcast_to_room(
                json.dumps({
                    "type": "voting_phase_started",
                    "game_state": game.get_game_state_dict()
                }),
                room_id
            )
            # Generate AI vote after delay
            asyncio.create_task(generate_ai_vote_delayed(room_id))
        else:
            await manager.broadcast_to_room(
                json.dumps({
                    "type": "response_received",
                    "game_state": game.get_game_state_dict()
                }),
                room_id
            )
    except Exception as e:
        logger.error(f"Error generating AI response: {e}")

async def generate_ai_vote_delayed(room_id: str):
    """Generate AI vote after a delay"""
    await asyncio.sleep(5 + (hash(room_id) % 8))  # 5-13 second delay
    
    game = get_game(room_id)
    if not game or game.phase != "voting" or not game.ai_player_id:
        return
    
    try:
        ai_bot = get_ai_bot()
        if not ai_bot:
            # Simple fallback voting - choose random player
            alive_players = [p for p in game.players if p["alive"] and not p["is_ai"]]
            if alive_players:
                target_id = random.choice(alive_players)["id"]
            else:
                return
        else:
            # Choose target and vote type
            target_id = ai_bot.choose_vote_target(game.players, game.responses)
        
        if target_id:
            game.add_vote(game.ai_player_id, target_id, "kick")
            
            # Get serializable game state
            game_state = game.get_game_state_dict()
            
            # Check if we can advance to results
            if game.can_advance_to_results():
                results = game.calculate_round_results()
                
                # Results are already properly serialized from calculate_round_results
                await manager.broadcast_to_room(
                    json.dumps({
                        "type": "round_results",
                        "results": results,
                        "game_state": game_state
                    }),
                    room_id
                )
                
                asyncio.create_task(advance_round_delayed(room_id))
            else:
                await manager.broadcast_to_room(
                    json.dumps({
                        "type": "vote_received",
                        "game_state": game_state
                    }),
                    room_id
                )
    except Exception as e:
        logger.error(f"Error generating AI vote: {e}")

async def advance_round_delayed(room_id: str):
    """Advance to next round after showing results"""
    await asyncio.sleep(5)  # 5 second delay to show results
    
    game = get_game(room_id)
    if not game:
        return
    
    try:
        winner = game.check_win_condition()
        if winner:
            game.phase = "game_over"
            await manager.broadcast_to_room(
                json.dumps({
                    "type": "game_over",
                    "winner": winner,
                    "game_state": game.get_game_state_dict()
                }),
                room_id
            )
        else:
            # Start next round
            game.next_round()
            await manager.broadcast_to_room(
                json.dumps({
                    "type": "new_round",
                    "game_state": game.get_game_state_dict()
                }),
                room_id
            )
            
            # Generate AI response for new round
            asyncio.create_task(generate_ai_response_delayed(room_id))
    except Exception as e:
        logger.error(f"Error advancing round: {e}")

# Cleanup task
@app.on_event("startup")
async def startup_event():
    """Start background cleanup task"""
    async def cleanup_task():
        while True:
            await asyncio.sleep(3600)  # Run every hour
            try:
                cleanup_old_games()
            except Exception as e:
                logger.error(f"Error during cleanup: {e}")
    
    asyncio.create_task(cleanup_task())

def main():
    """Entry point for the application"""
    import uvicorn
    
    # Get configuration from environment
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    
    uvicorn.run(app, host=host, port=port)

if __name__ == "__main__":
    main()