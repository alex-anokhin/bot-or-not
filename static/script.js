// Bot or Not Game - Frontend JavaScript

class BotOrNotGame {
    constructor() {
        this.gameState = null;
        this.playerId = null;
        this.roomId = null;
        this.websocket = null;
        this.timer = null;
        this.playerName = null;
        this.selectedLanguage = 'en';
        
        this.initializeI18n();
        this.initializeEventListeners();
        this.loadSessionData();
        
        // Debug: Check screen states periodically
        if (window.location.search.includes('debug')) {
            setInterval(() => {
                const activeScreens = document.querySelectorAll('.screen.active');
                console.log('Active screens:', Array.from(activeScreens).map(s => s.id));
            }, 2000);
        }
    }
    
    initializeI18n() {
        // Set up language selector
        this.setupLanguageSelector();
        
        // Update UI with current language
        window.i18n.updateUI();
        this.updateGameRules();
    }
    
    setupLanguageSelector() {
        const languageSelect = document.getElementById('language-select');
        const supportedLanguages = window.i18n.getSupportedLanguages();
        
        languageSelect.innerHTML = '';
        for (const [code, info] of Object.entries(supportedLanguages)) {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = `${info.flag} ${info.name}`;
            if (code === window.i18n.getCurrentLanguage()) {
                option.selected = true;
            }
            languageSelect.appendChild(option);
        }
        
        languageSelect.addEventListener('change', (e) => {
            window.i18n.setLanguage(e.target.value);
            this.updateGameRules();
            // Update selected language for room creation
            this.selectedLanguage = e.target.value;
        });
        
        // Initialize selected language
        this.selectedLanguage = window.i18n.getCurrentLanguage();
    }
    
    updateGameRules() {
        const rulesList = document.getElementById('game-rules-list');
        if (!rulesList) return;
        
        rulesList.innerHTML = '';
        
        const rules = window.i18n.t('welcome.rules');
        
        // Handle both array and string cases
        if (Array.isArray(rules)) {
            rules.forEach(rule => {
                const li = document.createElement('li');
                li.textContent = rule;
                rulesList.appendChild(li);
            });
        } else if (typeof rules === 'string') {
            // If it's a string (fallback case), create a single list item
            const li = document.createElement('li');
            li.textContent = rules;
            rulesList.appendChild(li);
        }
    }
    
    loadSessionData() {
        // Try to restore session from localStorage
        const savedSession = localStorage.getItem('botOrNotSession');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                this.playerId = session.playerId;
                this.roomId = session.roomId;
                this.playerName = session.playerName;
                
                // Try to reconnect to the game
                this.reconnectToGame();
            } catch (error) {
                console.error('Failed to restore session:', error);
                this.clearSession();
                this.showScreen('welcome-screen');
            }
        } else {
            this.showScreen('welcome-screen');
        }
    }
    
    saveSessionData() {
        if (this.playerId && this.roomId && this.playerName) {
            const session = {
                playerId: this.playerId,
                roomId: this.roomId,
                playerName: this.playerName
            };
            localStorage.setItem('botOrNotSession', JSON.stringify(session));
        }
    }
    
    clearSession() {
        localStorage.removeItem('botOrNotSession');
        this.playerId = null;
        this.roomId = null;
        this.playerName = null;
    }
    
    async reconnectToGame() {
        if (!this.roomId || !this.playerId) {
            this.showScreen('welcome-screen');
            return;
        }
        
        this.showLoading(true);
        try {
            // Check if room still exists and player is still in it
            const response = await fetch(`/room/${this.roomId}`);
            if (!response.ok) {
                throw new Error('Room no longer exists');
            }
            
            const gameState = await response.json();
            const playerExists = gameState.players.find(p => p.id === this.playerId);
            
            if (!playerExists) {
                throw new Error('Player no longer in room');
            }
            
            this.gameState = gameState;
            this.connectWebSocket();
            
            // Navigate to appropriate screen based on game state
            if (gameState.phase === 'waiting') {
                this.showLobby();
            } else if (gameState.phase === 'game_over') {
                this.showGameOver(gameState.winner);
            } else {
                this.showGame();
                if (gameState.phase === 'voting') {
                    this.showVotingPhase();
                } else if (gameState.phase === 'results') {
                    this.showResults({ /* results from gameState */ });
                }
                this.startTimer();
            }
            
            this.showToast('Reconnected to game', 'success');
        } catch (error) {
            console.error('Reconnection failed:', error);
            this.clearSession();
            this.showScreen('welcome-screen');
            this.showToast('Could not reconnect to previous game', 'warning');
        } finally {
            this.showLoading(false);
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
        
        document.getElementById('leave-room').addEventListener('click', () => {
            this.leaveRoom();
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
            this.startNewGameInRoom();
        });
        
        document.getElementById('leave-room-final').addEventListener('click', () => {
            this.leaveRoom();
        });
        
        // Enter key handling
        document.getElementById('player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handlePlayerSubmit();
        });
        
        document.getElementById('room-code').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handlePlayerSubmit();
        });
        
        // Handle page refresh/close
        window.addEventListener('beforeunload', () => {
            this.saveSessionData();
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
            body: JSON.stringify({ 
                player_name: playerName,
                language: this.selectedLanguage
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || window.i18n.t('messages.failedToCreate'));
        }
        
        const data = await response.json();
        this.roomId = data.room_id;
        this.playerId = data.player_id;
        this.playerName = playerName;
        this.gameState = data.game_state;
        
        this.saveSessionData();
        this.showLoading(false);
        this.connectWebSocket();
        this.showLobby();
        this.showToast(window.i18n.t('messages.roomCreated', { code: this.roomId }), 'success');
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
                let errorMessage = window.i18n.t('messages.failedToJoin');
                try {
                    const error = await response.json();
                    errorMessage = error.detail || errorMessage;
                } catch (e) {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            this.roomId = data.room_id;
            this.playerId = data.player_id;
            this.playerName = playerName;
            this.gameState = data.game_state;
            
            this.saveSessionData();
            this.connectWebSocket();
            this.showLobby();
            this.showLoading(false);
            this.showToast(window.i18n.t('messages.joinedRoom'), 'success');
            
        } catch (error) {
            console.error('Join room error:', error);
            throw error;
        }
    }

    async leaveRoom() {
        if (!this.roomId || !this.playerId) return;
        
        try {
            // Notify server that player is leaving
            await fetch('/leave-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: this.roomId,
                    player_id: this.playerId
                })
            });
        } catch (error) {
            console.error('Error leaving room:', error);
        }
        
        // Close websocket and clear session
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        
        this.clearTimer();
        this.hideSpectatorMode();
        this.clearSession();
        
        // Reset form and return to welcome
        document.getElementById('player-name').value = '';
        document.getElementById('room-code').value = '';
        document.getElementById('player-form').classList.add('hidden');
        
        this.showScreen('welcome-screen');
        this.showToast('Left the room', 'info');
    }
    
    async startNewGameInRoom() {
        if (!this.roomId) return;
        
        try {
            const response = await fetch('/reset-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room_id: this.roomId })
            });
            
            if (!response.ok) {
                throw new Error('Failed to reset room');
            }
            
            const data = await response.json();
            this.gameState = data.game_state;
            
            this.clearTimer();
            this.hideSpectatorMode();
            this.showLobby();
            this.showToast('Room reset! Ready for a new game', 'success');
            
        } catch (error) {
            console.error('Failed to reset room:', error);
            this.showToast('Failed to start new game', 'error');
        }
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${this.roomId}/${this.playerId}`;
        
        console.log('Connecting WebSocket to:', wsUrl);
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
            console.log('WebSocket connected');
            this.showToast(window.i18n.t('messages.connectedToGame'), 'success');
        };
        
        this.websocket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
        };
        
        this.websocket.onclose = () => {
            console.log('WebSocket disconnected');
            this.showToast(window.i18n.t('messages.disconnectedFromGame'), 'warning');
        };
        
        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.showToast(window.i18n.t('messages.connectionError'), 'error');
        };
    }

    handleWebSocketMessage(message) {
        console.log('WebSocket message:', message);
        
        switch (message.type) {
            case 'player_joined':
                this.gameState = message.game_state;
                this.updateUI();
                this.showToast(window.i18n.t('messages.playerJoined'), 'info');
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
        
        const displayElement = document.getElementById('display-room-code');
        const playerCountElement = document.getElementById('player-count');
        const roomFlag = document.getElementById('room-flag');
        
        if (!displayElement || !playerCountElement) {
            console.error('Lobby elements not found!');
            return;
        }
        
        displayElement.textContent = this.roomId;
        playerCountElement.textContent = this.gameState.players.length;
        
        // Show language flag
        if (roomFlag && this.gameState.language) {
            roomFlag.textContent = window.i18n.getFlag(this.gameState.language);
        }
        
        // Rest of updateLobby method...
        const playersList = document.getElementById('players-list');
        if (!playersList) {
            console.error('Players list element not found!');
            return;
        }
        
        playersList.innerHTML = '';
        
        this.gameState.players.forEach(player => {
            const playerCard = document.createElement('div');
            let cardClass = 'player-card';
            
            if (player.alive) {
                cardClass += ' alive';
            } else {
                cardClass += ' eliminated';
            }
            
            playerCard.className = cardClass;
            
            const isCurrentPlayer = player.id === this.playerId;
            const playerIndicator = isCurrentPlayer ? ` (${window.i18n.t('lobby.you', 'You')})` : '';
            
            let statusText = window.i18n.t('lobby.playerStatus.ready');
            if (!player.alive) {
                statusText = window.i18n.t('lobby.playerStatus.eliminated');
            }
            
            playerCard.innerHTML = `
                <div class="player-name">${player.name}${playerIndicator}</div>
                <div class="player-status">${statusText}</div>
            `;
            playersList.appendChild(playerCard);
        });
        
        const startButton = document.getElementById('start-game');
        const leaveButton = document.getElementById('leave-room');
        const minPlayersElement = document.querySelector('.min-players');
        
        if (startButton && leaveButton && minPlayersElement) {
            leaveButton.style.display = 'inline-block';
            
            if (this.gameState.can_start) {
                startButton.disabled = false;
                minPlayersElement.textContent = window.i18n.t('lobby.readyToStart');
            } else {
                startButton.disabled = true;
                minPlayersElement.textContent = window.i18n.t('lobby.needPlayers', { 
                    min: this.gameState.min_players || 2 
                });
            }
        }
    }

    isPlayerAlive() {
        if (!this.gameState || !this.playerId) return false;
        const currentPlayer = this.gameState.players.find(p => p.id === this.playerId);
        return currentPlayer ? currentPlayer.alive : false;
    }

    showSpectatorMode() {
        // Add a small, non-intrusive spectator notification
        const existingOverlay = document.getElementById('spectator-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = 'spectator-overlay';
        overlay.className = 'spectator-overlay';
        overlay.innerHTML = `
            <div class="spectator-content">
                <div class="spectator-icon">👻</div>
                <h3>Spectator Mode</h3>
                <p>You've been eliminated</p>
                <div class="spectator-stats">
                    <div class="stat">
                        <span class="stat-label">Alive:</span>
                        <span class="stat-value">${this.gameState.alive_players}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Round:</span>
                        <span class="stat-value">${this.gameState.current_round}</span>
                    </div>
                </div>
            </div>
        `;

        // document.body.appendChild(overlay);
    }

    hideSpectatorMode() {
        const overlay = document.getElementById('spectator-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    showGame() {
        this.showScreen('game-screen');
        this.showResponsePhase();
        this.updateGameHeader();
        
        // Check if player is eliminated and show spectator mode
        if (!this.isPlayerAlive()) {
            this.showSpectatorMode();
        }
    }
    
    showResponsePhase() {
        document.getElementById('response-phase').classList.remove('hidden');
        document.getElementById('voting-phase').classList.add('hidden');
        document.getElementById('results-phase').classList.add('hidden');
        
        if (this.gameState) {
            // Update prompt header
            const promptHeader = document.querySelector('.prompt-section h3');
            if (promptHeader) {
                promptHeader.textContent = window.i18n.t('game.prompt');
            }
            
            document.getElementById('game-prompt').textContent = this.gameState.prompt;
            
            // Update submit button text
            const submitButton = document.getElementById('submit-response');
            if (submitButton) {
                submitButton.textContent = window.i18n.t('game.submitResponse');
            }
            
            // Update waiting message
            const waitingElement = document.querySelector('.responses-waiting p');
            if (waitingElement) {
                waitingElement.textContent = window.i18n.t('game.waitingForPlayers');
            }
            
            this.updateResponsesStatus();
        }
        
        // Check if player is alive to enable/disable interactions
        const isAlive = this.isPlayerAlive();
        const responseInput = document.getElementById('response-input');
        const submitButton = document.getElementById('submit-response');
        
        if (isAlive) {
            // Reset response input for alive players
            responseInput.value = '';
            responseInput.disabled = false;
            responseInput.placeholder = window.i18n.t('game.placeholder');
            submitButton.disabled = false;
            this.hideSpectatorMode();
        } else {
            // Disable for eliminated players
            responseInput.value = '';
            responseInput.disabled = true;
            responseInput.placeholder = window.i18n.t('game.spectatorPlaceholder');
            submitButton.disabled = true;
            this.showSpectatorMode();
        }
        
        this.updateCharacterCount();
    }
    
    updateResponsesStatus() {
        if (!this.gameState) return;
        
        const totalPlayers = this.gameState.alive_players;
        const submittedResponses = this.gameState.responses.length;
        
        const statusDiv = document.getElementById('responses-status');
        statusDiv.innerHTML = window.i18n.t('game.responsesSubmitted', {
            count: submittedResponses,
            total: totalPlayers
        });
    }
    
    updateCharacterCount() {
        const input = document.getElementById('response-input');
        const counter = document.getElementById('char-count');
        
        if (!input || !counter) return; // Guard against null elements
        
        const length = input.value.length;
        counter.textContent = length;
        
        // Update character counter text
        const charCounterElement = document.querySelector('.char-counter');
        if (charCounterElement) {
            charCounterElement.innerHTML = `<span id="char-count">${length}</span>/180 ${window.i18n.t('game.characters')}`;
        }
        
        const counterParent = counter.parentElement;
        if (counterParent) {
            if (length > 180) {
                counterParent.classList.add('warning');
            } else {
                counterParent.classList.remove('warning');
            }
        }
    }

    async submitResponse() {
        const responseText = document.getElementById('response-input').value.trim();
        
        if (!responseText) {
            this.showToast(window.i18n.t('messages.enterResponse') || 'Please enter a response', 'error');
            return;
        }
        
        if (responseText.length < 10) {
            this.showToast(window.i18n.t('messages.responseMinLength') || 'Response must be at least 10 characters', 'error');
            return;
        }
        
        if (responseText.length > 180) {
            this.showToast(window.i18n.t('messages.responseMaxLength') || 'Response must be 180 characters or less', 'error');
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
            this.showToast(window.i18n.t('messages.responseSubmitted') || 'Response submitted!', 'success');
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    displayResponses() {
        if (!this.gameState || !this.gameState.responses) return;
        
        const responsesDiv = document.getElementById('responses-display');
        if (!responsesDiv) return;
        
        responsesDiv.innerHTML = '';
        
        const isAlive = this.isPlayerAlive();
        
        // Create header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'voting-header';
        
        if (isAlive) {
            headerDiv.innerHTML = '<h4>Click on a response to vote KICK that player:</h4>';
        } else {
            headerDiv.innerHTML = '<h4>Responses from remaining players:</h4><p class="spectator-note">You are watching as a spectator</p>';
        }
        
        responsesDiv.appendChild(headerDiv);
        
        this.gameState.responses.forEach((response, index) => {
            // Find the player who wrote this response
            const player = this.gameState.players.find(p => p.id === response.player_id);
            
            // Use anonymous display name during game phases
            const playerName = player ? (player.display_name || `Player ${player.anonymous_number || index + 1}`) : `Player ${index + 1}`;
            
            const responseDiv = document.createElement('div');
            responseDiv.className = 'response-item';
            
            // Only make clickable for alive players voting on others
            if (isAlive && response.player_id !== this.playerId) {
                responseDiv.classList.add('clickable');
                responseDiv.innerHTML = `
                    <div class="response-text">${response.text}</div>
                `;
                
                responseDiv.addEventListener('click', () => {
                    this.selectResponseVote(responseDiv, response.player_id);
                });
            } else if (response.player_id === this.playerId) {
                // Own response
                responseDiv.classList.add('own-response');
                responseDiv.innerHTML = `
                    <div class="response-text">${response.text}</div>
                    <div class="response-author">(Your response)</div>
                `;
            } else {
                // Spectator view - just show the response
                responseDiv.classList.add('spectator-view');
                responseDiv.innerHTML = `
                    <div class="response-text">${response.text}</div>
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
            
            this.showToast(window.i18n.t('messages.voteSubmitted') || 'Vote submitted!', 'success');
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // Remove duplicate method definitions - keep only the versions above
    // Remove any other duplicate showResponsePhase, updateCharacterCount, etc.
    
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
            body: JSON.stringify({ 
                player_name: playerName,
                language: this.selectedLanguage
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || window.i18n.t('messages.failedToCreate'));
        }
        
        const data = await response.json();
        this.roomId = data.room_id;
        this.playerId = data.player_id;
        this.playerName = playerName;
        this.gameState = data.game_state;
        
        this.saveSessionData();
        this.showLoading(false);
        this.connectWebSocket();
        this.showLobby();
        this.showToast(window.i18n.t('messages.roomCreated', { code: this.roomId }), 'success');
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
                let errorMessage = window.i18n.t('messages.failedToJoin');
                try {
                    const error = await response.json();
                    errorMessage = error.detail || errorMessage;
                } catch (e) {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            this.roomId = data.room_id;
            this.playerId = data.player_id;
            this.playerName = playerName;
            this.gameState = data.game_state;
            
            this.saveSessionData();
            this.connectWebSocket();
            this.showLobby();
            this.showLoading(false);
            this.showToast(window.i18n.t('messages.joinedRoom'), 'success');
            
        } catch (error) {
            console.error('Join room error:', error);
            throw error;
        }
    }

    async leaveRoom() {
        if (!this.roomId || !this.playerId) return;
        
        try {
            // Notify server that player is leaving
            await fetch('/leave-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: this.roomId,
                    player_id: this.playerId
                })
            });
        } catch (error) {
            console.error('Error leaving room:', error);
        }
        
        // Close websocket and clear session
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        
        this.clearTimer();
        this.hideSpectatorMode();
        this.clearSession();
        
        // Reset form and return to welcome
        document.getElementById('player-name').value = '';
        document.getElementById('room-code').value = '';
        document.getElementById('player-form').classList.add('hidden');
        
        this.showScreen('welcome-screen');
        this.showToast('Left the room', 'info');
    }
    
    async startNewGameInRoom() {
        if (!this.roomId) return;
        
        try {
            const response = await fetch('/reset-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room_id: this.roomId })
            });
            
            if (!response.ok) {
                throw new Error('Failed to reset room');
            }
            
            const data = await response.json();
            this.gameState = data.game_state;
            
            this.clearTimer();
            this.hideSpectatorMode();
            this.showLobby();
            this.showToast('Room reset! Ready for a new game', 'success');
            
        } catch (error) {
            console.error('Failed to reset room:', error);
            this.showToast('Failed to start new game', 'error');
        }
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${this.roomId}/${this.playerId}`;
        
        console.log('Connecting WebSocket to:', wsUrl);
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
            console.log('WebSocket connected');
            this.showToast(window.i18n.t('messages.connectedToGame'), 'success');
        };
        
        this.websocket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
        };
        
        this.websocket.onclose = () => {
            console.log('WebSocket disconnected');
            this.showToast(window.i18n.t('messages.disconnectedFromGame'), 'warning');
        };
        
        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.showToast(window.i18n.t('messages.connectionError'), 'error');
        };
    }

    handleWebSocketMessage(message) {
        console.log('WebSocket message:', message);
        
        switch (message.type) {
            case 'player_joined':
                this.gameState = message.game_state;
                this.updateUI();
                this.showToast(window.i18n.t('messages.playerJoined'), 'info');
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
        
        const displayElement = document.getElementById('display-room-code');
        const playerCountElement = document.getElementById('player-count');
        const roomFlag = document.getElementById('room-flag');
        
        if (!displayElement || !playerCountElement) {
            console.error('Lobby elements not found!');
            return;
        }
        
        displayElement.textContent = this.roomId;
        playerCountElement.textContent = this.gameState.players.length;
        
        // Show language flag
        if (roomFlag && this.gameState.language) {
            roomFlag.textContent = window.i18n.getFlag(this.gameState.language);
        }
        
        // Rest of updateLobby method...
        const playersList = document.getElementById('players-list');
        if (!playersList) {
            console.error('Players list element not found!');
            return;
        }
        
        playersList.innerHTML = '';
        
        this.gameState.players.forEach(player => {
            const playerCard = document.createElement('div');
            let cardClass = 'player-card';
            
            if (player.alive) {
                cardClass += ' alive';
            } else {
                cardClass += ' eliminated';
            }
            
            playerCard.className = cardClass;
            
            const isCurrentPlayer = player.id === this.playerId;
            const playerIndicator = isCurrentPlayer ? ` (${window.i18n.t('lobby.you', 'You')})` : '';
            
            let statusText = window.i18n.t('lobby.playerStatus.ready');
            if (!player.alive) {
                statusText = window.i18n.t('lobby.playerStatus.eliminated');
            }
            
            playerCard.innerHTML = `
                <div class="player-name">${player.name}${playerIndicator}</div>
                <div class="player-status">${statusText}</div>
            `;
            playersList.appendChild(playerCard);
        });
        
        const startButton = document.getElementById('start-game');
        const leaveButton = document.getElementById('leave-room');
        const minPlayersElement = document.querySelector('.min-players');
        
        if (startButton && leaveButton && minPlayersElement) {
            leaveButton.style.display = 'inline-block';
            
            if (this.gameState.can_start) {
                startButton.disabled = false;
                minPlayersElement.textContent = window.i18n.t('lobby.readyToStart');
            } else {
                startButton.disabled = true;
                minPlayersElement.textContent = window.i18n.t('lobby.needPlayers', { 
                    min: this.gameState.min_players || 2 
                });
            }
        }
    }

    isPlayerAlive() {
        if (!this.gameState || !this.playerId) return false;
        const currentPlayer = this.gameState.players.find(p => p.id === this.playerId);
        return currentPlayer ? currentPlayer.alive : false;
    }

    showSpectatorMode() {
        // Add a small, non-intrusive spectator notification
        const existingOverlay = document.getElementById('spectator-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = 'spectator-overlay';
        overlay.className = 'spectator-overlay';
        overlay.innerHTML = `
            <div class="spectator-content">
                <div class="spectator-icon">👻</div>
                <h3>Spectator Mode</h3>
                <p>You've been eliminated</p>
                <div class="spectator-stats">
                    <div class="stat">
                        <span class="stat-label">Alive:</span>
                        <span class="stat-value">${this.gameState.alive_players}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Round:</span>
                        <span class="stat-value">${this.gameState.current_round}</span>
                    </div>
                </div>
            </div>
        `;

        // document.body.appendChild(overlay);
    }

    hideSpectatorMode() {
        const overlay = document.getElementById('spectator-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    showGame() {
        this.showScreen('game-screen');
        this.showResponsePhase();
        this.updateGameHeader();
        
        // Check if player is eliminated and show spectator mode
        if (!this.isPlayerAlive()) {
            this.showSpectatorMode();
        }
    }
    
    showResponsePhase() {
        document.getElementById('response-phase').classList.remove('hidden');
        document.getElementById('voting-phase').classList.add('hidden');
        document.getElementById('results-phase').classList.add('hidden');
        
        if (this.gameState) {
            // Update prompt header
            const promptHeader = document.querySelector('.prompt-section h3');
            if (promptHeader) {
                promptHeader.textContent = window.i18n.t('game.prompt');
            }
            
            document.getElementById('game-prompt').textContent = this.gameState.prompt;
            
            // Update submit button text
            const submitButton = document.getElementById('submit-response');
            if (submitButton) {
                submitButton.textContent = window.i18n.t('game.submitResponse');
            }
            
            // Update waiting message
            const waitingElement = document.querySelector('.responses-waiting p');
            if (waitingElement) {
                waitingElement.textContent = window.i18n.t('game.waitingForPlayers');
            }
            
            this.updateResponsesStatus();
        }
        
        // Check if player is alive to enable/disable interactions
        const isAlive = this.isPlayerAlive();
        const responseInput = document.getElementById('response-input');
        const submitButton = document.getElementById('submit-response');
        
        if (isAlive) {
            // Reset response input for alive players
            responseInput.value = '';
            responseInput.disabled = false;
            responseInput.placeholder = window.i18n.t('game.placeholder');
            submitButton.disabled = false;
            this.hideSpectatorMode();
        } else {
            // Disable for eliminated players
            responseInput.value = '';
            responseInput.disabled = true;
            responseInput.placeholder = window.i18n.t('game.spectatorPlaceholder');
            submitButton.disabled = true;
            this.showSpectatorMode();
        }
        
        this.updateCharacterCount();
    }
    
    updateResponsesStatus() {
        if (!this.gameState) return;
        
        const totalPlayers = this.gameState.alive_players;
        const submittedResponses = this.gameState.responses.length;
        
        const statusDiv = document.getElementById('responses-status');
        statusDiv.innerHTML = window.i18n.t('game.responsesSubmitted', {
            count: submittedResponses,
            total: totalPlayers
        });
    }
    
    updateCharacterCount() {
        const input = document.getElementById('response-input');
        const counter = document.getElementById('char-count');
        
        if (!input || !counter) return; // Guard against null elements
        
        const length = input.value.length;
        counter.textContent = length;
        
        // Update character counter text
        const charCounterElement = document.querySelector('.char-counter');
        if (charCounterElement) {
            charCounterElement.innerHTML = `<span id="char-count">${length}</span>/180 ${window.i18n.t('game.characters')}`;
        }
        
        const counterParent = counter.parentElement;
        if (counterParent) {
            if (length > 180) {
                counterParent.classList.add('warning');
            } else {
                counterParent.classList.remove('warning');
            }
        }
    }

    async submitResponse() {
        const responseText = document.getElementById('response-input').value.trim();
        
        if (!responseText) {
            this.showToast(window.i18n.t('messages.enterResponse') || 'Please enter a response', 'error');
            return;
        }
        
        if (responseText.length < 10) {
            this.showToast(window.i18n.t('messages.responseMinLength') || 'Response must be at least 10 characters', 'error');
            return;
        }
        
        if (responseText.length > 180) {
            this.showToast(window.i18n.t('messages.responseMaxLength') || 'Response must be 180 characters or less', 'error');
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
            this.showToast(window.i18n.t('messages.responseSubmitted') || 'Response submitted!', 'success');
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    displayResponses() {
        if (!this.gameState || !this.gameState.responses) return;
        
        const responsesDiv = document.getElementById('responses-display');
        if (!responsesDiv) return;
        
        responsesDiv.innerHTML = '';
        
        const isAlive = this.isPlayerAlive();
        
        // Create header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'voting-header';
        
        if (isAlive) {
            headerDiv.innerHTML = '<h4>Click on a response to vote KICK that player:</h4>';
        } else {
            headerDiv.innerHTML = '<h4>Responses from remaining players:</h4><p class="spectator-note">You are watching as a spectator</p>';
        }
        
        responsesDiv.appendChild(headerDiv);
        
        this.gameState.responses.forEach((response, index) => {
            // Find the player who wrote this response
            const player = this.gameState.players.find(p => p.id === response.player_id);
            
            // Use anonymous display name during game phases
            const playerName = player ? (player.display_name || `Player ${player.anonymous_number || index + 1}`) : `Player ${index + 1}`;
            
            const responseDiv = document.createElement('div');
            responseDiv.className = 'response-item';
            
            // Only make clickable for alive players voting on others
            if (isAlive && response.player_id !== this.playerId) {
                responseDiv.classList.add('clickable');
                responseDiv.innerHTML = `
                    <div class="response-text">${response.text}</div>
                `;
                
                responseDiv.addEventListener('click', () => {
                    this.selectResponseVote(responseDiv, response.player_id);
                });
            } else if (response.player_id === this.playerId) {
                // Own response
                responseDiv.classList.add('own-response');
                responseDiv.innerHTML = `
                    <div class="response-text">${response.text}</div>
                    <div class="response-author">(Your response)</div>
                `;
            } else {
                // Spectator view - just show the response
                responseDiv.classList.add('spectator-view');
                responseDiv.innerHTML = `
                    <div class="response-text">${response.text}</div>
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
            
            this.showToast(window.i18n.t('messages.voteSubmitted') || 'Vote submitted!', 'success');
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // Remove duplicate method definitions - keep only the versions above
    // Remove any other duplicate showResponsePhase, updateCharacterCount, etc.
    
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
            body: JSON.stringify({ 
                player_name: playerName,
                language: this.selectedLanguage
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || window.i18n.t('messages.failedToCreate'));
        }
        
        const data = await response.json();
        this.roomId = data.room_id;
        this.playerId = data.player_id;
        this.playerName = playerName;
        this.gameState = data.game_state;
        
        this.saveSessionData();
        this.showLoading(false);
        this.connectWebSocket();
        this.showLobby();
        this.showToast(window.i18n.t('messages.roomCreated', { code: this.roomId }), 'success');
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
                let errorMessage = window.i18n.t('messages.failedToJoin');
                try {
                    const error = await response.json();
                    errorMessage = error.detail || errorMessage;
                } catch (e) {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            this.roomId = data.room_id;
            this.playerId = data.player_id;
            this.playerName = playerName;
            this.gameState = data.game_state;
            
            this.saveSessionData();
            this.connectWebSocket();
            this.showLobby();
            this.showLoading(false);
            this.showToast(window.i18n.t('messages.joinedRoom'), 'success');
            
        } catch (error) {
            console.error('Join room error:', error);
            throw error;
        }
    }

    async leaveRoom() {
        if (!this.roomId || !this.playerId) return;
        
        try {
            // Notify server that player is leaving
            await fetch('/leave-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: this.roomId,
                    player_id: this.playerId
                })
            });
        } catch (error) {
            console.error('Error leaving room:', error);
        }
        
        // Close websocket and clear session
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        
        this.clearTimer();
        this.hideSpectatorMode();
        this.clearSession();
        
        // Reset form and return to welcome
        document.getElementById('player-name').value = '';
        document.getElementById('room-code').value = '';
        document.getElementById('player-form').classList.add('hidden');
        
        this.showScreen('welcome-screen');
        this.showToast('Left the room', 'info');
    }
    
    async startNewGameInRoom() {
        if (!this.roomId) return;
        
        try {
            const response = await fetch('/reset-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room_id: this.roomId })
            });
            
            if (!response.ok) {
                throw new Error('Failed to reset room');
            }
            
            const data = await response.json();
            this.gameState = data.game_state;
            
            this.clearTimer();
            this.hideSpectatorMode();
            this.showLobby();
            this.showToast('Room reset! Ready for a new game', 'success');
            
        } catch (error) {
            console.error('Failed to reset room:', error);
            this.showToast('Failed to start new game', 'error');
        }
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${this.roomId}/${this.playerId}`;
        
        console.log('Connecting WebSocket to:', wsUrl);
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
            console.log('WebSocket connected');
            this.showToast(window.i18n.t('messages.connectedToGame'), 'success');
        };
        
        this.websocket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
        };
        
        this.websocket.onclose = () => {
            console.log('WebSocket disconnected');
            this.showToast(window.i18n.t('messages.disconnectedFromGame'), 'warning');
        };
        
        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.showToast(window.i18n.t('messages.connectionError'), 'error');
        };
    }

    handleWebSocketMessage(message) {
        console.log('WebSocket message:', message);
        
        switch (message.type) {
            case 'player_joined':
                this.gameState = message.game_state;
                this.updateUI();
                this.showToast(window.i18n.t('messages.playerJoined'), 'info');
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
        
        const displayElement = document.getElementById('display-room-code');
        const playerCountElement = document.getElementById('player-count');
        const roomFlag = document.getElementById('room-flag');
        
        if (!displayElement || !playerCountElement) {
            console.error('Lobby elements not found!');
            return;
        }
        
        displayElement.textContent = this.roomId;
        playerCountElement.textContent = this.gameState.players.length;
        
        // Show language flag
        if (roomFlag && this.gameState.language) {
            roomFlag.textContent = window.i18n.getFlag(this.gameState.language);
        }
        
        // Rest of updateLobby method...
        const playersList = document.getElementById('players-list');
        if (!playersList) {
            console.error('Players list element not found!');
            return;
        }
        
        playersList.innerHTML = '';
        
        this.gameState.players.forEach(player => {
            const playerCard = document.createElement('div');
            let cardClass = 'player-card';
            
            if (player.alive) {
                cardClass += ' alive';
            } else {
                cardClass += ' eliminated';
            }
            
            playerCard.className = cardClass;
            
            const isCurrentPlayer = player.id === this.playerId;
            const playerIndicator = isCurrentPlayer ? ` (${window.i18n.t('lobby.you', 'You')})` : '';
            
            let statusText = window.i18n.t('lobby.playerStatus.ready');
            if (!player.alive) {
                statusText = window.i18n.t('lobby.playerStatus.eliminated');
            }
            
            playerCard.innerHTML = `
                <div class="player-name">${player.name}${playerIndicator}</div>
                <div class="player-status">${statusText}</div>
            `;
            playersList.appendChild(playerCard);
        });
        
        const startButton = document.getElementById('start-game');
        const leaveButton = document.getElementById('leave-room');
        const minPlayersElement = document.querySelector('.min-players');
        
        if (startButton && leaveButton && minPlayersElement) {
            leaveButton.style.display = 'inline-block';
            
            if (this.gameState.can_start) {
                startButton.disabled = false;
                minPlayersElement.textContent = window.i18n.t('lobby.readyToStart');
            } else {
                startButton.disabled = true;
                minPlayersElement.textContent = window.i18n.t('lobby.needPlayers', { 
                    min: this.gameState.min_players || 2 
                });
            }
        }
    }

    isPlayerAlive() {
        if (!this.gameState || !this.playerId) return false;
        const currentPlayer = this.gameState.players.find(p => p.id === this.playerId);
        return currentPlayer ? currentPlayer.alive : false;
    }

    showSpectatorMode() {
        // Add a small, non-intrusive spectator notification
        const existingOverlay = document.getElementById('spectator-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = 'spectator-overlay';
        overlay.className = 'spectator-overlay';
        overlay.innerHTML = `
            <div class="spectator-content">
                <div class="spectator-icon">👻</div>
                <h3>Spectator Mode</h3>
                <p>You've been eliminated</p>
                <div class="spectator-stats">
                    <div class="stat">
                        <span class="stat-label">Alive:</span>
                        <span class="stat-value">${this.gameState.alive_players}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Round:</span>
                        <span class="stat-value">${this.gameState.current_round}</span>
                    </div>
                </div>
            </div>
        `;

        // document.body.appendChild(overlay);
    }

    hideSpectatorMode() {
        const overlay = document.getElementById('spectator-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    showGame() {
        this.showScreen('game-screen');
        this.showResponsePhase();
        this.updateGameHeader();
        
        // Check if player is eliminated and show spectator mode
        if (!this.isPlayerAlive()) {
            this.showSpectatorMode();
        }
    }
    
    showResponsePhase() {
        document.getElementById('response-phase').classList.remove('hidden');
        document.getElementById('voting-phase').classList.add('hidden');
        document.getElementById('results-phase').classList.add('hidden');
        
        if (this.gameState) {
            // Update prompt header
            const promptHeader = document.querySelector('.prompt-section h3');
            if (promptHeader) {
                promptHeader.textContent = window.i18n.t('game.prompt');
            }
            
            document.getElementById('game-prompt').textContent = this.gameState.prompt;
            
            // Update submit button text
            const submitButton = document.getElementById('submit-response');
            if (submitButton) {
                submitButton.textContent = window.i18n.t('game.submitResponse');
            }
            
            // Update waiting message
            const waitingElement = document.querySelector('.responses-waiting p');
            if (waitingElement) {
                waitingElement.textContent = window.i18n.t('game.waitingForPlayers');
            }
            
            this.updateResponsesStatus();
        }
        
        // Check if player is alive to enable/disable interactions
        const isAlive = this.isPlayerAlive();
        const responseInput = document.getElementById('response-input');
        const submitButton = document.getElementById('submit-response');
        
        if (isAlive) {
            // Reset response input for alive players
            responseInput.value = '';
            responseInput.disabled = false;
            responseInput.placeholder = window.i18n.t('game.placeholder');
            submitButton.disabled = false;
            this.hideSpectatorMode();
        } else {
            // Disable for eliminated players
            responseInput.value = '';
            responseInput.disabled = true;
            responseInput.placeholder = window.i18n.t('game.spectatorPlaceholder');
            submitButton.disabled = true;
            this.showSpectatorMode();
        }
        
        this.updateCharacterCount();
    }
    
    updateResponsesStatus() {
        if (!this.gameState) return;
        
        const totalPlayers = this.gameState.alive_players;
        const submittedResponses = this.gameState.responses.length;
        
        const statusDiv = document.getElementById('responses-status');
        statusDiv.innerHTML = window.i18n.t('game.responsesSubmitted', {
            count: submittedResponses,
            total: totalPlayers
        });
    }
    
    updateCharacterCount() {
        const input = document.getElementById('response-input');
        const counter = document.getElementById('char-count');
        
        if (!input || !counter) return; // Guard against null elements
        
        const length = input.value.length;
        counter.textContent = length;
        
        // Update character counter text
        const charCounterElement = document.querySelector('.char-counter');
        if (charCounterElement) {
            charCounterElement.innerHTML = `<span id="char-count">${length}</span>/180 ${window.i18n.t('game.characters')}`;
        }
        
        const counterParent = counter.parentElement;
        if (counterParent) {
            if (length > 180) {
                counterParent.classList.add('warning');
            } else {
                counterParent.classList.remove('warning');
            }
        }
    }

    async submitResponse() {
        const responseText = document.getElementById('response-input').value.trim();
        
        if (!responseText) {
            this.showToast(window.i18n.t('messages.enterResponse') || 'Please enter a response', 'error');
            return;
        }
        
        if (responseText.length < 10) {
            this.showToast(window.i18n.t('messages.responseMinLength') || 'Response must be at least 10 characters', 'error');
            return;
        }
        
        if (responseText.length > 180) {
            this.showToast(window.i18n.t('messages.responseMaxLength') || 'Response must be 180 characters or less', 'error');
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
            this.showToast(window.i18n.t('messages.responseSubmitted') || 'Response submitted!', 'success');
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    displayResponses() {
        if (!this.gameState || !this.gameState.responses) return;
        
        const responsesDiv = document.getElementById('responses-display');
        if (!responsesDiv) return;
        
        responsesDiv.innerHTML = '';
        
        const isAlive = this.isPlayerAlive();
        
        // Create header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'voting-header';
        
        if (isAlive) {
            headerDiv.innerHTML = '<h4>Click on a response to vote KICK that player:</h4>';
        } else {
            headerDiv.innerHTML = '<h4>Responses from remaining players:</h4><p class="spectator-note">You are watching as a spectator</p>';
        }
        
        responsesDiv.appendChild(headerDiv);
        
        this.gameState.responses.forEach((response, index) => {
            // Find the player who wrote this response
            const player = this.gameState.players.find(p => p.id === response.player_id);
            
            // Use anonymous display name during game phases
            const playerName = player ? (player.display_name || `Player ${player.anonymous_number || index + 1}`) : `Player ${index + 1}`;
            
            const responseDiv = document.createElement('div');
            responseDiv.className = 'response-item';
            
            // Only make clickable for alive players voting on others
            if (isAlive && response.player_id !== this.playerId) {
                responseDiv.classList.add('clickable');
                responseDiv.innerHTML = `
                    <div class="response-text">${response.text}</div>
                `;
                
                responseDiv.addEventListener('click', () => {
                    this.selectResponseVote(responseDiv, response.player_id);
                });
            } else if (response.player_id === this.playerId) {
                // Own response
                responseDiv.classList.add('own-response');
                responseDiv.innerHTML = `
                    <div class="response-text">${response.text}</div>
                    <div class="response-author">(Your response)</div>
                `;
            } else {
                // Spectator view - just show the response
                responseDiv.classList.add('spectator-view');
                responseDiv.innerHTML = `
                    <div class="response-text">${response.text}</div>
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
            
            this.showToast(window.i18n.t('messages.voteSubmitted') || 'Vote submitted!', 'success');
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // Remove duplicate method definitions - keep only the versions above
    // Remove any other duplicate showResponsePhase, updateCharacterCount, etc.
    
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
            body: JSON.stringify({ 
                player_name: playerName,
                language: this.selectedLanguage
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || window.i18n.t('messages.failedToCreate'));
        }
        
        const data = await response.json();
        this.roomId = data.room_id;
        this.playerId = data.player_id;
        this.playerName = playerName;
        this.gameState = data.game_state;
        
        this.saveSessionData();
        this.showLoading(false);
        this.connectWebSocket();
        this.showLobby();
        this.showToast(window.i18n.t('messages.roomCreated', { code: this.roomId }), 'success');
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
                let errorMessage = window.i18n.t('messages.failedToJoin');
                try {
                    const error = await response.json();
                    errorMessage = error.detail || errorMessage;
                } catch (e) {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            this.roomId = data.room_id;
            this.playerId = data.player_id;
            this.playerName = playerName;
            this.gameState = data.game_state;
            
            this.saveSessionData();
            this.connectWebSocket();
            this.showLobby();
            this.showLoading(false);
            this.showToast(window.i18n.t('messages.joinedRoom'), 'success');
            
        } catch (error) {
            console.error('Join room error:', error);
            throw error;
        }
    }

    async leaveRoom() {
        if (!this.roomId || !this.playerId) return;
		try {
			// Notify server that player is leaving
			await fetch('/leave-room', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					room_id: this.roomId,
					player_id: this.playerId
				})
			});
		} catch (error) {
			console.error('Error leaving room:', error);
		} finally {
			this.showLoading(false);
		}
		// Reset room and player IDs
		this.roomId = null;
		this.playerId = null;
		this.playerName = null;
		this.gameState = null;
	}

	connectWebSocket() {
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsUrl = `${protocol}//${window.location.host}/ws/${this.roomId}/${this.playerId}`;

		console.log('Connecting WebSocket to:', wsUrl);

		this.websocket = new WebSocket(wsUrl);

		this.websocket.onopen = () => {
			console.log('WebSocket connected');
			this.showToast(window.i18n.t('messages.connectedToGame'), 'success');
		};

		this.websocket.onmessage = (event) => {
			const message = JSON.parse(event.data);
			this.handleWebSocketMessage(message);
		};

		this.websocket.onclose = () => {
			console.log('WebSocket disconnected');
			this.showToast(window.i18n.t('messages.disconnectedFromGame'), 'warning');
		};

		this.websocket.onerror = (error) => {
			console.error('WebSocket error:', error);
			this.showToast(window.i18n.t('messages.connectionError'), 'error');
		};
	}

	handleWebSocketMessage(message) {
		console.log('WebSocket message:', message);
		
		switch (message.type) {
			case 'player_joined':
				this.gameState = message.game_state;
				this.updateUI();
				this.showToast(window.i18n.t('messages.playerJoined'), 'info');
				break;
			case 'response_received':
			case 'vote_received':
				this.gameState = message.game_state;
				this.updateUI();
				break;

			case 'game_reset':
				this.gameState = message.game_state;
				this.updateUI();
				this.showToast(window.i18n.t('messages.gameReset'), 'info');
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
		
		const displayElement = document.getElementById('display-room-code');
		const playerCountElement = document.getElementById('player-count');
		const roomFlag = document.getElementById('room-flag');
		
		if (!displayElement || !playerCountElement) {
			console.error('Lobby elements not found!');
			return;
		}
		
		displayElement.textContent = this.roomId;
		playerCountElement.textContent = this.gameState.players.length;
		
		// Show language flag
		if (roomFlag && this.gameState.language) {
			roomFlag.textContent = window.i18n.getFlag(this.gameState.language);
		}
		
		// Rest of updateLobby method...
		const playersList = document.getElementById('players-list');
		if (!playersList) {
			console.error('Players list element not found!');
			return;
		}
		
		playersList.innerHTML = '';
		
		this.gameState.players.forEach(player => {
			const playerCard = document.createElement('div');
			let cardClass = 'player-card';
			
			if (player.alive) {
				cardClass += ' alive';
			} else {
				cardClass += ' eliminated';
			}
			
			playerCard.className = cardClass;
			
			const isCurrentPlayer = player.id === this.playerId;
			const playerIndicator = isCurrentPlayer ? ` (${window.i18n.t('lobby.you', 'You')})` : '';
			
			let statusText = window.i18n.t('lobby.playerStatus.ready');
			if (!player.alive) {
				statusText = window.i18n.t('lobby.playerStatus.eliminated');
			}
			
			playerCard.innerHTML = `
				<div class="player-name">${player.name}${playerIndicator}</div>
				<div class="player-status">${statusText}</div>
			`;
			playersList.appendChild(playerCard);
		});
		
		const startButton = document.getElementById('start-game');
		const leaveButton = document.getElementById('leave-room');
		const minPlayersElement = document.querySelector('.min-players');
		if (startButton && leaveButton && minPlayersElement) {
			leaveButton.style.display = 'inline-block';
			
			if (this.gameState.can_start) {
				startButton.disabled = false;
				minPlayersElement.textContent = window.i18n.t('lobby.readyToStart');
			} else {
				startButton.disabled = true;
				minPlayersElement.textContent = window.i18n.t('lobby.needPlayers', { 
					min: this.gameState.min_players || 2 
				});
			}
		}
	}
	isPlayerAlive() {
		if (!this.gameState || !this.playerId) return false;
		const currentPlayer = this.gameState.players.find(p => p.id === this.playerId);
		return currentPlayer ? currentPlayer.alive : false;
	}

}