import os
import openai
import random
import asyncio
from typing import List, Dict, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class AIBot:
    """Handles AI bot responses using OpenAI API"""
    
    def __init__(self):
        self.client = None
        self.personality_traits = [
            "slightly sarcastic but friendly",
            "enthusiastic and optimistic", 
            "thoughtful and introspective",
            "quirky and creative",
            "laid-back and casual",
            "witty and clever"
        ]
    
    def _initialize_client(self):
        """Lazy initialization of OpenAI client"""
        if self.client is None:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable is required")
            try:
                self.client = openai.AsyncOpenAI(api_key=api_key)
            except Exception as e:
                print(f"Failed to initialize OpenAI client: {e}")
                raise
    
    async def generate_response(self, prompt: str, other_responses: List[Dict] = None) -> str:
        """Generate a human-like response to the game prompt"""
        
        try:
            self._initialize_client()
            
            # Select a random personality for this response
            personality = random.choice(self.personality_traits)
            
            # Build context with other responses if available
            context = ""
            if other_responses:
                context = "\n\nHere are some other responses to this prompt for context:\n"
                for i, response in enumerate(other_responses[:3]):  # Limit to 3 for context
                    context += f"- {response.get('text', '')}\n"
            
            system_prompt = f"""You are playing a social deduction game called "Bot or Not" where humans try to identify the AI player. 
            Your goal is to blend in with human players by giving creative, natural responses that sound human-written.
            
            Be {personality} in your response style.
            Keep responses between 140-180 characters.
            Be creative, personal, and slightly imperfect like a real human would be.
            Avoid being too polished or obviously AI-generated.
            Use casual language, maybe include a typo or informal grammar occasionally.
            Reference real human experiences and emotions.{context}"""
            
            user_prompt = f"""Respond to this prompt as if you're a human player: "{prompt}"

            Remember: one sentence from 5 to 10 words, sound human, be creative and personal."""

            response = await self.client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=60,
                temperature=0.9,
                presence_penalty=0.6,
                frequency_penalty=0.3
            )
            
            ai_response = response.choices[0].message.content.strip()
            
            # Ensure response is within character limit
            # if len(ai_response) > 180:
            #     ai_response = ai_response[:177] + "..."
            # elif len(ai_response) < 140:
            #     # If too short, add some casual filler
            #     fillers = [" lol", " haha", " honestly", " tbh", " ngl"]
            #     while len(ai_response) < 20 and len(ai_response) < 100:
            #         filler = random.choice(fillers)
            #         if len(ai_response + filler) <= 120:
            #             ai_response += filler
            #         else:
            #             break
            
            return ai_response
            
        except Exception as e:
            print(f"OpenAI API error: {e}")
            # Fallback responses if OpenAI API fails
            return self._get_fallback_response(prompt)
    
    def _get_fallback_response(self, prompt: str) -> str:
        """Get fallback response when OpenAI API fails"""
        fallback_responses = {
            "ghost": "I'd probably mess with the coffee machine first... classic ghost move right? 😅",
            "dance": "Point dramatically at the menu, do some aggressive gestures, hope for the best lol",
            "elevator": "So... this is awkward. Want to talk about the weather or just stare at the floor?", 
            "animals": "Apparently my neighbor's cat thinks I'm a disappointment. The squirrels agree. 🐿️"
        }
        
        # Try to match a fallback response to the prompt
        prompt_lower = prompt.lower()
        for key, response in fallback_responses.items():
            if key in prompt_lower:
                return response
        
        # Generic fallback
        generic_fallbacks = [
            "Honestly, that's a tough one... probably something really weird knowing me 😂",
            "Oh man, I'd probably overthink it and end up doing something completely random lol",
            "Classic me would find a way to make this situation even weirder somehow 🤷‍♀️"
        ]
        
        return random.choice(generic_fallbacks)
    
    def should_vote_kick(self, target_response: str, all_responses: List[Dict]) -> bool:
        """Simple heuristic for AI to decide whether to vote kick someone"""
        
        # Basic strategies for AI voting:
        # 1. Sometimes vote randomly to seem human
        # 2. Avoid voting for responses that seem too "perfect" (might be AI)
        # 3. Vote for responses that seem suspicious
        
        if random.random() < 0.3:  # 30% random voting
            return random.choice([True, False])
        
        # Check for potentially AI-like characteristics
        suspicious_indicators = [
            len(target_response) > 175,  # Too close to character limit
            target_response.count('.') > 2,  # Too many periods
            ' optimal ' in target_response.lower(),
            ' efficient ' in target_response.lower(),
            ' logical ' in target_response.lower(),
            target_response.count(',') > 3,  # Too many commas
        ]
        
        suspicion_score = sum(suspicious_indicators)
        
        # Vote to kick if response seems too AI-like
        return suspicion_score >= 2
    
    def choose_vote_target(self, players: List[Dict], responses: List[Dict]) -> Optional[str]:
        """Choose who to vote for based on responses"""
        
        alive_players = [p for p in players if p["alive"] and not p["is_ai"]]
        if not alive_players:
            return None
        
        # Score each player based on their response
        player_scores = {}
        
        for response in responses:
            player_id = response["player_id"]
            # Skip AI's own response
            if any(p["id"] == player_id and p["is_ai"] for p in players):
                continue
            
            text = response["text"]
            suspicion_score = 0
            
            # Check for AI-like patterns
            if len(text) > 170:
                suspicion_score += 2
            if text.count('.') > 2:
                suspicion_score += 1
            if any(word in text.lower() for word in ['optimal', 'efficient', 'logical', 'systematically']):
                suspicion_score += 3
            if text.count(',') > 3:
                suspicion_score += 1
            if len(text.split()) > 25:  # Too wordy
                suspicion_score += 1
            
            player_scores[player_id] = suspicion_score
        
        # Sometimes vote randomly to appear human
        if random.random() < 0.4 or not player_scores:
            return random.choice(alive_players)["id"]
        
        # Vote for most suspicious player
        most_suspicious = max(player_scores.items(), key=lambda x: x[1])
        return most_suspicious[0]

# Global AI bot instance - lazy initialization
ai_bot = AIBot()