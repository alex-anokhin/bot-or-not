// Bot or Not Game - Frontend JavaScript

class BotOrNotGame {
    constructor() {
        this.gameState = null;
        this.playerId = null;
        this.roomId = null;
        this.websocket = null;
        this.timer = null;
        
        this.initializeEventListeners();
        this.showScreen('welcome-screen');
        
        // Debug: Check screen states periodically
        if (window.location.search.includes('debug')) {
            setInterval(() => {
                const activeScreens = document.querySelectorAll('.screen.active');
                console.log('Active screens:', Array.from(activeScreens).map(s => s.id));
            }, 2000);
        }
    }
    
    initializeEventListeners() {
        // Welcome screen buttons
        document.getElementById('create-room-btn').addEventListener('click', () => {
            this.showPlayerForm('create');
        });
        
        document.getElementById('join-room-btn').addEventListener('click', () => {
            this.showPlayerForm('join');
        });
        
        document.getElementById('submit-player').addEventListener('click', () => {
            this.handlePlayerSubmit();
        });
        
        // Lobby screen
        document.getElementById('copy-code').addEventListener('click', () => {
            this.copyRoomCode();
        });
        
        document.getElementById('start-game').addEventListener('click', () => {
            this.startGame();
        });
        
        // Game screen
        document.getElementById('response-input').addEventListener('input', () => {
            this.updateCharacterCount();
        });
        
        document.getElementById('submit-response').addEventListener('click', () => {
            this.submitResponse();
        });
        
        // Game over screen
        document.getElementById('new-game').addEventListener('click', () => {
            this.resetGame();
        });
        
        // Enter key handling
        document.getElementById('player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handlePlayerSubmit();
        });
        
        document.getElementById('room-code').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handlePlayerSubmit();
        });
    }
    
    showScreen(screenId) {
        console.log('Switching to screen:', screenId); // Debug log
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
            console.log('Removed active from:', screen.id); // Debug log
        });
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            console.log('Added active to:', screenId); // Debug log
        } else {
            console.error('Screen not found:', screenId); // Debug log
        }
    }
    
    showPlayerForm(action) {
        const form = document.getElementById('player-form');
        const roomCodeInput = document.getElementById('room-code');
        
        form.classList.remove('hidden');
        
        if (action === 'create') {
            roomCodeInput.style.display = 'none';
            roomCodeInput.required = false;
            this.formAction = 'create';
        } else {
            roomCodeInput.style.display = 'block';
            roomCodeInput.required = true;
            this.formAction = 'join';
        }
        
        document.getElementById('player-name').focus();
    }
    
    async handlePlayerSubmit() {
        const playerName = document.getElementById('player-name').value.trim();
        const roomCode = document.getElementById('room-code').value.trim();
        
        if (!playerName) {
            this.showToast('Please enter your name', 'error');
            return;
        }
        
        if (this.formAction === 'join' && !roomCode) {
            this.showToast('Please enter room code', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            if (this.formAction === 'create') {
                await this.createRoom(playerName);
            } else {
                // Extract just the number part of the room code
                const numericRoomCode = roomCode.replace('room_', '');
                await this.joinRoom(numericRoomCode, playerName);
            }
        } catch (error) {
            this.showToast(error.message, 'error');
            this.showLoading(false);
        }
    }
    
    async createRoom(playerName) {
        const response = await fetch('/create-room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player_name: playerName })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create room');
        }
        
        const data = await response.json();
        this.roomId = data.room_id;
        this.playerId = data.player_id;
        this.gameState = data.game_state;
        
        console.log('Room created:', data); // Debug log
        console.log('About to show lobby...'); // Debug log
        
        this.showLoading(false); // Hide loading first
        this.connectWebSocket();
        this.showLobby(); // This should switch to lobby
        this.showToast(`Room created! Code: ${this.roomId}`, 'success');
    }

    async joinRoom(roomCode, playerName) {
        try {
            const response = await fetch('/join-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    room_id: roomCode,
                    player_name: playerName 
                })
            });
            
            if (!response.ok) {
                let errorMessage = 'Failed to join room';
                try {
                    const error = await response.json();
                    errorMessage = error.detail || errorMessage;
                } catch (e) {
                    // If response is not JSON (like HTML error page), get status text
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            this.roomId = data.room_id;
            this.playerId = data.player_id;
            this.gameState = data.game_state;
            
            console.log('Room joined:', data); // Debug log
            
            this.connectWebSocket();
            this.showLobby();
            this.showLoading(false);
            this.showToast('Successfully joined room!', 'success');
            
        } catch (error) {
            console.error('Join room error:', error);
            throw error;
        }
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${this.roomId}/${this.playerId}`;
        
        console.log('Connecting WebSocket to:', wsUrl); // Debug log
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
            console.log('WebSocket connected');
            this.showToast('Connected to game', 'success');
        };
        
        this.websocket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
        };
        
        this.websocket.onclose = () => {
            console.log('WebSocket disconnected');
            this.showToast('Disconnected from game', 'warning');
        };
        
        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.showToast('Connection error', 'error');
        };
    }

    handleWebSocketMessage(message) {
        console.log('WebSocket message:', message);
        
        switch (message.type) {
            case 'player_joined':
                this.gameState = message.game_state;
                this.updateUI();
                this.showToast('A player joined the game', 'info');
                break;
            case 'response_received':
            case 'vote_received':
                this.gameState = message.game_state;
                this.updateUI();
                break;
                
            case 'game_started':
                this.gameState = message.game_state;
                this.showGame();
                this.startTimer();
                break;
                
            case 'voting_phase_started':
                this.gameState = message.game_state;
                this.showVotingPhase();
                this.startTimer();
                break;
                
            case 'round_results':
                this.gameState = message.game_state;
                this.showResults(message.results);
                break;
                
            case 'new_round':
                this.gameState = message.game_state;
                this.showResponsePhase();
                this.startTimer();
                break;
                
            case 'game_over':
                this.gameState = message.game_state;
                this.showGameOver(message.winner);
                break;
        }
    }
    
    showLobby() {
        console.log('Showing lobby with room:', this.roomId); // Debug log
        
        // Force screen change with timeout to ensure DOM is ready
        setTimeout(() => {
            this.showScreen('lobby-screen');
            this.updateLobby();
        }, 100);
    }
    
    updateLobby() {
        if (!this.gameState) {
            console.error('No game state available for lobby update');
            return;
        }
        
        console.log('Updating lobby with state:', this.gameState); // Debug log
        
        // Verify we're on the lobby screen
        const currentScreen = document.querySelector('.screen.active');
        console.log('Current active screen:', currentScreen ? currentScreen.id : 'none');
        
        const displayElement = document.getElementById('display-room-code');
        const playerCountElement = document.getElementById('player-count');
        
        if (!displayElement || !playerCountElement) {
            console.error('Lobby elements not found!');
            return;
        }
        
        displayElement.textContent = this.roomId;
        playerCountElement.textContent = this.gameState.players.length;
        
        const playersList = document.getElementById('players-list');
        if (!playersList) {
            console.error('Players list element not found!');
            return;
        }
        
        playersList.innerHTML = '';
        
        this.gameState.players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card alive';
            
            // Show if this is the current player
            const isCurrentPlayer = player.id === this.playerId;
            const playerIndicator = isCurrentPlayer ? ' (You)' : '';
            
            playerCard.innerHTML = `
                <div class="player-name">${player.name}${playerIndicator}</div>
                <div class="player-status">Ready</div>
            `;
            playersList.appendChild(playerCard);
        });
        
        const startButton = document.getElementById('start-game');
        if (startButton) {
            if (this.gameState.can_start) {
                startButton.disabled = false;
                const minPlayersElement = document.querySelector('.min-players');
                if (minPlayersElement) {
                    minPlayersElement.textContent = 'Ready to start!';
                }
            } else {
                startButton.disabled = true;
                const minPlayersElement = document.querySelector('.min-players');
                if (minPlayersElement) {
                    minPlayersElement.textContent = 'Need at least 4 players to start';
                }
            }
        }
        
        console.log('Lobby update complete'); // Debug log
    }

    displayResponses() {
        if (!this.gameState || !this.gameState.responses) return;
        
        const responsesDiv = document.getElementById('responses-display');
        responsesDiv.innerHTML = '';
        
        // Create header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'voting-header';
        headerDiv.innerHTML = '<h4>Click on a response to vote KICK that player:</h4>';
        responsesDiv.appendChild(headerDiv);
        
        this.gameState.responses.forEach((response, index) => {
            // Find the player who wrote this response
            const player = this.gameState.players.find(p => p.id === response.player_id);
            const playerName = player ? player.name : `Player ${index + 1}`;
            
            const responseDiv = document.createElement('div');
            responseDiv.className = 'response-item clickable';
            responseDiv.innerHTML = `
                <div class="response-text">${response.text}</div>
                <div class="response-author">Response ${index + 1} by ${playerName}</div>
                <div class="vote-hint">Click to vote KICK</div>
            `;
            
            // Only allow voting on other players' responses
            if (response.player_id !== this.playerId) {
                responseDiv.addEventListener('click', () => {
                    this.selectResponseVote(responseDiv, response.player_id);
                });
            } else {
                responseDiv.classList.add('own-response');
                responseDiv.innerHTML = `
                    <div class="response-text">${response.text}</div>
                    <div class="response-author">Response ${index + 1} by ${playerName} (Your response)</div>
                `;
            }
            
            responsesDiv.appendChild(responseDiv);
        });
    }
    
    selectResponseVote(responseElement, playerId) {
        // Remove previous selection
        document.querySelectorAll('.response-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Select current response
        responseElement.classList.add('selected');
        this.selectedVoteTarget = playerId;
        
        // Submit vote immediately
        this.submitVote(playerId);
    }

    startTimer() {
        this.clearTimer();
        
        if (!this.gameState || !this.gameState.timer_end) return;
        
        const endTime = new Date(this.gameState.timer_end);
        
        this.timer = setInterval(() => {
            const now = new Date();
            const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
            
            const timerElement = document.getElementById('timer');
            if (timerElement) {
                timerElement.textContent = `${remaining}s`;
                
                if (remaining <= 10) {
                    timerElement.classList.add('warning');
                } else {
                    timerElement.classList.remove('warning');
                }
                
                if (remaining <= 0) {
                    this.clearTimer();
                    timerElement.textContent = 'Time up!';
                    this.handleTimerExpired();
                }
            }
        }, 1000);
    }
    
    handleTimerExpired() {
        // Auto-advance the game when timer expires
        if (this.gameState.phase === 'response') {
            // If in response phase and time is up, just wait for server to advance
            this.showToast('Time is up! Waiting for other players...', 'warning');
        } else if (this.gameState.phase === 'voting') {
            // If in voting phase and haven't voted yet, submit a random vote or skip
            if (!this.selectedVoteTarget) {
                this.showToast('Time is up! Your vote was skipped.', 'warning');
                // Optionally submit a random vote or let the server handle it
            }
        }
    }
    
    showResults(results) {
        document.getElementById('response-phase').classList.add('hidden');
        document.getElementById('voting-phase').classList.add('hidden');
        document.getElementById('results-phase').classList.remove('hidden');
        
        const resultsDiv = document.getElementById('results-content');
        let resultsHTML = '';
        
        if (results.eliminated_player) {
            const wasAI = results.eliminated_player.is_ai;
            resultsHTML += `
                <div class="elimination-result">
                    <h4>${results.eliminated_player.name} was eliminated!</h4>
                    <p>${wasAI ? '🎉 It was the AI! Good job!' : '😬 It was a human player...'}</p>
                </div>
            `;
        } else {
            resultsHTML += `
                <div class="elimination-result">
                    <h4>No one was eliminated this round</h4>
                    <p>Not enough votes to eliminate anyone</p>
                </div>
            `;
        }
        
        resultsHTML += '<div class="vote-summary"><h4>Vote Summary:</h4>';
        for (const [playerId, voteCount] of Object.entries(results.vote_counts)) {
            const player = this.gameState.players.find(p => p.id === playerId);
            if (player) {
                resultsHTML += `<p>${player.name}: ${voteCount} votes</p>`;
            }
        }
        resultsHTML += '</div>';
        
        resultsDiv.innerHTML = resultsHTML;
        this.updateGameHeader();
    }
    
    showGameOver(winner) {
        this.showScreen('game-over-screen');
        
        const announcement = document.getElementById('winner-announcement');
        const finalResults = document.getElementById('final-results');
        
        if (winner === 'ai') {
            announcement.textContent = '🤖 The AI Wins!';
            announcement.style.color = '#f44336';
        } else {
            announcement.textContent = '👥 Humans Win!';
            announcement.style.color = '#4CAF50';
        }
        
        // Show final player status
        let resultsHTML = '<h3>Final Results:</h3>';
        this.gameState.players.forEach(player => {
            const status = player.alive ? 'Survived' : 'Eliminated';
            const type = player.is_ai ? '🤖 AI' : '👤 Human';
            resultsHTML += `<p><strong>${player.name}</strong> - ${type} - ${status}</p>`;
        });
        
        finalResults.innerHTML = resultsHTML;
        
        // Clear timer
        this.clearTimer();
    }
    
    startTimer() {
        this.clearTimer();
        
        if (!this.gameState || !this.gameState.timer_end) return;
        
        const endTime = new Date(this.gameState.timer_end);
        
        this.timer = setInterval(() => {
            const now = new Date();
            const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
            
            const timerElement = document.getElementById('timer');
            timerElement.textContent = `${remaining}s`;
            
            if (remaining <= 10) {
                timerElement.classList.add('warning');
            } else {
                timerElement.classList.remove('warning');
            }
            
            if (remaining <= 0) {
                this.clearTimer();
                timerElement.textContent = 'Time up!';
            }
        }, 1000);
    }
    
    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    
    resetGame() {
        this.gameState = null;
        this.playerId = null;
        this.roomId = null;
        
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        
        this.clearTimer();
        
        // Reset form
        document.getElementById('player-name').value = '';
        document.getElementById('room-code').value = '';
        document.getElementById('player-form').classList.add('hidden');
        
        this.showScreen('welcome-screen');
    }
    
    updateUI() {
        const currentScreen = document.querySelector('.screen.active').id;
        
        switch (currentScreen) {
            case 'lobby-screen':
                this.updateLobby();
                break;
            case 'game-screen':
                this.updateGameHeader();
                if (this.gameState.phase === 'response') {
                    this.updateResponsesStatus();
                }
                break;
        }
    }
    
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    async copyRoomCode() {
        try {
            await navigator.clipboard.writeText(this.roomId);
            this.showToast('Room code copied!', 'success');
        } catch (error) {
            this.showToast('Could not copy room code', 'error');
        }
    }
    
    async startGame() {
        try {
            const response = await fetch('/start-game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room_id: this.roomId })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to start game');
            }
            
            this.showToast('Game started!', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }
    
    showGame() {
        this.showScreen('game-screen');
        this.showResponsePhase();
        this.updateGameHeader();
    }
    
    updateGameHeader() {
        if (!this.gameState) return;
        
        document.getElementById('current-round').textContent = this.gameState.current_round;
        document.getElementById('current-phase').textContent = this.formatPhase(this.gameState.phase);
        document.getElementById('alive-count').textContent = this.gameState.alive_players;
    }
    
    formatPhase(phase) {
        switch (phase) {
            case 'response': return 'Response Phase';
            case 'voting': return 'Voting Phase';
            case 'results': return 'Results';
            default: return phase;
        }
    }
    
    showResponsePhase() {
        document.getElementById('response-phase').classList.remove('hidden');
        document.getElementById('voting-phase').classList.add('hidden');
        document.getElementById('results-phase').classList.add('hidden');
        
        if (this.gameState) {
            document.getElementById('game-prompt').textContent = this.gameState.prompt;
            this.updateResponsesStatus();
        }
        
        // Reset response input
        document.getElementById('response-input').value = '';
        document.getElementById('response-input').disabled = false;
        document.getElementById('submit-response').disabled = false;
        this.updateCharacterCount();
    }
    
    updateResponsesStatus() {
        if (!this.gameState) return;
        
        const totalPlayers = this.gameState.alive_players;
        const submittedResponses = this.gameState.responses.length;
        
        const statusDiv = document.getElementById('responses-status');
        statusDiv.innerHTML = `${submittedResponses}/${totalPlayers} responses submitted`;
    }
    
    updateCharacterCount() {
        const input = document.getElementById('response-input');
        const counter = document.getElementById('char-count');
        const length = input.value.length;
        
        counter.textContent = length;
        
        if (length > 180) {
            counter.parentElement.classList.add('warning');
        } else {
            counter.parentElement.classList.remove('warning');
        }
    }
    
    async submitResponse() {
        const responseText = document.getElementById('response-input').value.trim();
        
        if (!responseText) {
            this.showToast('Please enter a response', 'error');
            return;
        }
        
        if (responseText.length < 10) {
            this.showToast('Response must be at least 10 characters', 'error');
            return;
        }
        
        if (responseText.length > 180) {
            this.showToast('Response must be 180 characters or less', 'error');
            return;
        }
        
        try {
            const response = await fetch('/submit-response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: this.roomId,
                    player_id: this.playerId,
                    response_text: responseText
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to submit response');
            }
            
            document.getElementById('submit-response').disabled = true;
            document.getElementById('response-input').disabled = true;
            this.showToast('Response submitted!', 'success');
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }
    
    showVotingPhase() {
        document.getElementById('response-phase').classList.add('hidden');
        document.getElementById('voting-phase').classList.remove('hidden');
        document.getElementById('results-phase').classList.add('hidden');
        
        this.displayResponses();
        this.updateGameHeader();
    }
    
    async submitVote(targetPlayerId) {
        try {
            const response = await fetch('/submit-vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: this.roomId,
                    player_id: this.playerId,
                    target_player_id: targetPlayerId,
                    vote_type: 'kick'
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to submit vote');
            }
            
            // Disable all response items after voting
            document.querySelectorAll('.response-item.clickable').forEach(item => {
                item.classList.add('disabled');
                item.style.pointerEvents = 'none';
            });
            
            this.showToast('Vote submitted!', 'success');
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new BotOrNotGame();
});
