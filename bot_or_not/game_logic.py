import random
import time
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from .prompts import get_random_prompt

class GameState:
	"""Manages the state and logic for a Bot or Not game room"""
	
	def __init__(self, room_id: str, language: str = 'en'):
		self.room_id = room_id
		self.language = language
		self.players: List[Dict] = []
		self.current_round = 0
		self.phase = "waiting"  # waiting, response, voting, results, game_over
		self.prompt = ""
		self.responses: List[Dict] = []
		self.votes: List[Dict] = []
		self.ai_player_id: Optional[str] = None
		self.timer_end: Optional[datetime] = None
		self.max_players = 8
		self.min_players = 2
		self.created_at = datetime.now()
		
	def add_player(self, player_id: str, name: str) -> bool:
		"""Add a player to the game if there's room"""
		if len(self.players) >= self.max_players:
			return False
		
		if any(p["id"] == player_id for p in self.players):
			return False
		
		player = {
			"id": player_id,
			"name": name,
			"is_ai": False,
			"alive": True,
			"joined_at": datetime.now()
		}
		
		self.players.append(player)
		return True
	
	def add_ai_player(self) -> str:
		"""Add AI player to the game"""
		ai_names = ["Alex", "Sam", "Jordan", "Casey", "Riley", "Morgan", "Taylor", "Jamie", "Cameron", "Avery",
					"Charlie", "Skyler", "Quinn", "Drew", "Peyton", "Reese", "Sage", "Rowan", "Finley", "Emerson",
					"Blake", "Hayden", "Kendall", "Tatum", "Aubrey", "Parker", "Sydney", "Dakota", "Cory", "Jessie",
					"Alexis", "Taylor", "Jordan", "Casey", "Riley", "Morgan", "Jamie", "Cameron", "Avery"]
		ai_name = random.choice(ai_names)
		ai_id = f"ai_{random.randint(1000, 9999)}"
		
		ai_player = {
			"id": ai_id,
			"name": ai_name,
			"is_ai": True,
			"alive": True,
			"joined_at": datetime.now()
		}
		
		self.players.append(ai_player)
		self.ai_player_id = ai_id
		return ai_id
	
	def can_start_game(self) -> bool:
		"""Check if game can start (enough players)"""
		return len(self.players) >= self.min_players
	
	def start_game(self) -> bool:
		"""Start the game by adding AI and beginning first round"""
		if not self.can_start_game():
			return False
		
		# Add AI player if not already added
		if not self.ai_player_id:
			self.add_ai_player()
		
		# Assign anonymous player numbers and randomize order
		self.assign_anonymous_numbers()
		
		self.phase = "response"
		self.current_round = 1
		self.start_response_phase()
		return True
	
	def assign_anonymous_numbers(self):
		"""Assign anonymous player numbers (Player 1, Player 2, etc.) and randomize positions"""
		# Shuffle players to randomize AI position
		shuffled_players = self.players.copy()
		random.shuffle(shuffled_players)
		
		# Assign anonymous numbers
		for i, player in enumerate(shuffled_players):
			player["anonymous_number"] = i + 1
			player["display_name"] = f"Player {i + 1}"
		
		# Update the players list with new order
		self.players = shuffled_players

	def start_response_phase(self):
		"""Start a new response phase with a random prompt"""
		self.phase = "response"
		self.prompt = get_random_prompt(self.language)
		self.responses = []
		self.votes = []
		self.timer_end = datetime.now() + timedelta(seconds=60)
	
	def add_response(self, player_id: str, text: str) -> bool:
		"""Add a player's response to the current prompt"""
		if self.phase != "response":
			return False
		
		player = self.get_player(player_id)
		if not player or not player["alive"]:
			return False
		
		# Validate response length
		text = text.strip()
		if len(text) < 10 or len(text) > 180:
			return False
		
		# Remove existing response from this player
		self.responses = [r for r in self.responses if r["player_id"] != player_id]
		
		response = {
			"player_id": player_id,
			"text": text,
			"timestamp": datetime.now()
		}
		
		self.responses.append(response)
		return True
	
	def can_advance_to_voting(self) -> bool:
		"""Check if all alive players have submitted responses or timer expired"""
		alive_players = [p for p in self.players if p["alive"]]
		
		# Check if timer has expired
		if self.timer_end and datetime.now() > self.timer_end:
			return True
			
		# Check if all players have responded
		return len(self.responses) >= len(alive_players)
	
	def start_voting_phase(self):
		"""Start the voting phase"""
		if self.phase != "response":
			return False
		
		self.phase = "voting"
		self.timer_end = datetime.now() + timedelta(seconds=60)
		# Shuffle responses to anonymize them initially
		random.shuffle(self.responses)
		return True
	
	def add_vote(self, voter_id: str, target_id: str, vote_type: str) -> bool:
		"""Add a vote (kick or trust)"""
		if self.phase != "voting":
			return False
		
		voter = self.get_player(voter_id)
		target = self.get_player(target_id)
		
		if not voter or not target or not voter["alive"] or not target["alive"]:
			return False
		
		if voter_id == target_id:
			return False
		
		# Remove existing vote from this voter
		self.votes = [v for v in self.votes if v["voter_id"] != voter_id]
		
		vote = {
			"voter_id": voter_id,
			"target_id": target_id,
			"type": vote_type,  # "kick" or "trust"
			"timestamp": datetime.now()
		}
		
		self.votes.append(vote)
		return True
	
	def can_advance_to_results(self) -> bool:
		"""Check if all alive players have voted or timer expired"""
		alive_players = [p for p in self.players if p["alive"]]
		
		# Check if timer has expired
		if self.timer_end and datetime.now() > self.timer_end:
			return True
			
		# Check if all players have voted
		return len(self.votes) >= len(alive_players)
	
	def calculate_round_results(self) -> Dict:
		"""Calculate voting results and eliminate player if needed"""
		if self.phase != "voting":
			return {}
		
		# Count kick votes for each player
		kick_counts = {}
		alive_players = [p for p in self.players if p["alive"]]
		
		for player in alive_players:
			kick_counts[player["id"]] = 0
		
		for vote in self.votes:
			if vote["type"] == "kick" and vote["target_id"] in kick_counts:
				kick_counts[vote["target_id"]] += 1
		
		# Find player with most kick votes
		eliminated_player_id = None
		max_kicks = 0
		tied_players = []
		
		for player_id, kick_count in kick_counts.items():
			if kick_count > max_kicks:
				max_kicks = kick_count
				eliminated_player_id = player_id
				tied_players = [player_id]
			elif kick_count == max_kicks and kick_count > 0:
				tied_players.append(player_id)
		
		# Handle ties by random elimination
		if len(tied_players) > 1 and max_kicks > 0:
			eliminated_player_id = random.choice(tied_players)
		
		# Eliminate player if they received at least one vote
		eliminated_player = None
		if eliminated_player_id and max_kicks > 0:
			eliminated_player = self.get_player(eliminated_player_id)
			if eliminated_player:
				eliminated_player["alive"] = False
				# Create a clean serializable copy of the eliminated player
				eliminated_player_copy = {
					"id": eliminated_player["id"],
					"name": eliminated_player["name"],
					"is_ai": eliminated_player["is_ai"],
					"alive": eliminated_player["alive"]
				}
				# Add other fields that might exist, ensuring datetime conversion
				if "joined_at" in eliminated_player:
					if hasattr(eliminated_player["joined_at"], 'isoformat'):
						eliminated_player_copy["joined_at"] = eliminated_player["joined_at"].isoformat()
					else:
						eliminated_player_copy["joined_at"] = eliminated_player["joined_at"]
				
				if "anonymous_number" in eliminated_player:
					eliminated_player_copy["anonymous_number"] = eliminated_player["anonymous_number"]
				
				if "display_name" in eliminated_player:
					eliminated_player_copy["display_name"] = eliminated_player["display_name"]
				
				eliminated_player = eliminated_player_copy
		
		self.phase = "results"
		
		return {
			"eliminated_player": eliminated_player,
			"vote_counts": kick_counts,
			"total_votes": len(self.votes),
			"was_tie": len(tied_players) > 1 and max_kicks > 0
		}
	
	def check_win_condition(self) -> Optional[str]:
		"""Check if game has ended and return winner"""
		alive_players = [p for p in self.players if p["alive"]]
		alive_humans = [p for p in alive_players if not p["is_ai"]]
		ai_player = self.get_player(self.ai_player_id) if self.ai_player_id else None
		
		# AI wins if it's in final 2
		if len(alive_players) <= 2 and ai_player and ai_player["alive"]:
			return "ai"
		
		# Humans win if AI is eliminated
		if ai_player and not ai_player["alive"]:
			return "humans"
		
		# Humans win if only humans remain
		if len(alive_humans) == len(alive_players) and len(alive_players) > 0:
			return "humans"
		
		return None
	
	def next_round(self) -> bool:
		"""Advance to next round if game hasn't ended"""
		winner = self.check_win_condition()
		if winner:
			self.phase = "game_over"
			return False
		
		self.current_round += 1
		self.start_response_phase()
		return True
	
	def get_player(self, player_id: str) -> Optional[Dict]:
		"""Get player by ID"""
		for player in self.players:
			if player["id"] == player_id:
				return player
		return None
	
	def get_alive_players(self) -> List[Dict]:
		"""Get all alive players"""
		return [p for p in self.players if p["alive"]]
	
	def get_game_state_dict(self) -> Dict:
		"""Get game state as dictionary for API responses"""
		winner = self.check_win_condition()
		
		# Convert datetime objects to ISO strings for JSON serialization
		responses_serializable = []
		for response in self.responses:
			response_copy = response.copy()
			if 'timestamp' in response_copy:
				response_copy['timestamp'] = response_copy['timestamp'].isoformat()
			responses_serializable.append(response_copy)
		
		votes_serializable = []
		for vote in self.votes:
			vote_copy = vote.copy()
			if 'timestamp' in vote_copy:
				vote_copy['timestamp'] = vote_copy['timestamp'].isoformat()
			votes_serializable.append(vote_copy)
		
		players_serializable = []
		for player in self.players:
			player_copy = player.copy()
			if 'joined_at' in player_copy:
				player_copy['joined_at'] = player_copy['joined_at'].isoformat()
			players_serializable.append(player_copy)
		
		return {
			"room_id": self.room_id,
			"language": self.language,
			"players": players_serializable,
			"current_round": self.current_round,
			"phase": self.phase,
			"prompt": self.prompt,
			"responses": responses_serializable if self.phase in ["voting", "results"] else [],
			"votes": votes_serializable if self.phase == "results" else [],
			"ai_player_id": self.ai_player_id,
			"timer_end": self.timer_end.isoformat() if self.timer_end else None,
			"winner": winner,
			"can_start": self.can_start_game(),
			"alive_players": len(self.get_alive_players())
		}

	def remove_player(self, player_id: str) -> bool:
		"""Remove a player from the game"""
		if self.phase != "waiting":
			# During active game, just mark as disconnected
			player = self.get_player(player_id)
			if player:
				player["disconnected"] = True
				return True
			return False
		
		# In lobby, completely remove the player
		initial_count = len(self.players)
		self.players = [p for p in self.players if p["id"] != player_id]
		
		# If AI player left, clear AI player ID
		if player_id == self.ai_player_id:
			self.ai_player_id = None
		
		return len(self.players) < initial_count
	
	def reset_to_lobby(self) -> bool:
		"""Reset game state back to lobby"""
		if self.phase == "waiting":
			return True  # Already in lobby
		
		# Reset all players to alive and remove AI
		human_players = [p for p in self.players if not p["is_ai"] and not p.get("disconnected", False)]
		for player in human_players:
			player["alive"] = True
			if "anonymous_number" in player:
				del player["anonymous_number"]
			if "display_name" in player:
				del player["display_name"]
		
		self.players = human_players
		self.current_round = 0
		self.phase = "waiting"
		self.prompt = ""
		self.responses = []
		self.votes = []
		self.ai_player_id = None
		self.timer_end = None
		
		return True


# Global game state storage
games: Dict[str, GameState] = {}

def create_room(language: str = 'en') -> str:
	"""Create a new game room with unique ID"""
	room_id = f"{random.randint(100000, 999999)}"
	while room_id in games:
		room_id = f"{random.randint(100000, 999999)}"
	
	games[room_id] = GameState(room_id, language)
	return room_id

def get_game(room_id: str) -> Optional[GameState]:
	"""Get game by room ID"""
	return games.get(room_id)

def cleanup_old_games():
	"""Remove games older than 2 hours"""
	cutoff = datetime.now() - timedelta(hours=2)
	old_rooms = [
		room_id for room_id, game in games.items()
		if game.created_at < cutoff
	]
	
	for room_id in old_rooms:
		del games[room_id]