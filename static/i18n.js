// Internationalization system for Bot or Not Game

class I18n {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.supportedLanguages = {
            'en': { name: 'English', flag: '🇺🇸' },
            'de': { name: 'Deutsch', flag: '🇩🇪' },
            'es': { name: 'Español', flag: '🇪🇸' },
            'fr': { name: 'Français', flag: '🇫🇷' },
            'ru': { name: 'Русский', flag: '🇷🇺' },
            'it': { name: 'Italiano', flag: '🇮🇹' }
        };
        
        this.loadTranslations();
        this.detectLanguage();
    }
    
    detectLanguage() {
        // Try to get saved language or detect from browser
        const saved = localStorage.getItem('bot-or-not-language');
        if (saved && this.supportedLanguages[saved]) {
            this.currentLanguage = saved;
        } else {
            const browserLang = navigator.language.slice(0, 2);
            if (this.supportedLanguages[browserLang]) {
                this.currentLanguage = browserLang;
            }
        }
    }
    
    setLanguage(lang) {
        if (!this.supportedLanguages[lang]) return false;
        
        this.currentLanguage = lang;
        localStorage.setItem('bot-or-not-language', lang);
        this.updateUI();
        return true;
    }
    
    t(key, replacements = {}) {
        const translation = this.getNestedTranslation(key);
        if (!translation) return key;
        
        // If translation is an array, return it as-is (don't try to replace placeholders)
        if (Array.isArray(translation)) {
            return translation;
        }
        
        // Replace placeholders like {{name}} only for strings
        return translation.replace(/\{\{(\w+)\}\}/g, (match, placeholder) => {
            return replacements[placeholder] || match;
        });
    }
    
    getNestedTranslation(key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLanguage];
        
        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                return this.translations['en'] ? this.getNestedFromLang('en', key) : key;
            }
        }
        
        return value || this.getNestedFromLang('en', key) || key;
    }
    
    getNestedFromLang(lang, key) {
        const keys = key.split('.');
        let value = this.translations[lang];
        
        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                return null;
            }
        }
        
        return value;
    }
    
    updateUI() {
        // Update all elements with data-i18n attributes
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' && element.type !== 'button') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });
        
        // Update title
        document.title = this.t('meta.title');
    }
    
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    
    getSupportedLanguages() {
        return this.supportedLanguages;
    }
    
    getFlag(lang) {
        return this.supportedLanguages[lang]?.flag || '🌐';
    }
    
    loadTranslations() {
        this.translations = {
            en: {
                meta: {
                    title: "Bot or Not - Social Deduction Game"
                },
                welcome: {
                    title: "🤖 Bot or Not",
                    subtitle: "Can you spot the AI among your friends?",
                    gameInfo: "👥 2-8 players • 🎯 Find the AI • 💭 Creative responses",
                    howToPlay: "How to Play:",
                    rules: [
                        "🤖 One AI player joins 2-8 humans in each game",
                        "📝 Everyone responds to creative prompts (140-180 characters)",
                        "🗳️ Vote to eliminate the most suspicious player each round",
                        "🏆 Humans win by finding the AI • AI wins by reaching final 2",
                        "⏱️ Each round: 60s to respond + 60s to vote"
                    ],
                    createRoom: "Create Room",
                    joinRoom: "Join Room"
                },
                form: {
                    enterName: "Enter your name",
                    enterRoomCode: "Enter room code (e.g., 123456)",
                    continue: "Continue",
                    selectLanguage: "Select Game Language"
                },
                lobby: {
                    title: "Game Lobby",
                    shareCode: "Share this room code with friends:",
                    copy: "📋 Copy",
                    shareInstruction: "Friends can join by clicking \"Join Room\" on the main page and entering this code.",
                    playersCount: "Players",
                    startGame: "Start Game",
                    leaveRoom: "Leave Room",
                    needPlayers: "Need at least {{min}} players to start",
                    readyToStart: "Ready to start!",
                    playerStatus: {
                        ready: "Ready",
                        eliminated: "Eliminated"
                    }
                },
                game: {
                    round: "Round",
                    responsePhase: "Response Phase",
                    votingPhase: "Voting Phase",
                    results: "Results",
                    playersAlive: "players alive",
                    prompt: "Prompt:",
                    submitResponse: "Submit Response",
                    waitingForPlayers: "Waiting for other players...",
                    responsesSubmitted: "{{count}}/{{total}} responses submitted",
                    characters: "characters",
                    votingHeader: "Click on a response to vote KICK that player:",
                    spectatorNote: "You are watching as a spectator",
                    yourResponse: "(Your response)",
                    clickToVoteKick: "Click to vote KICK",
                    responsesMissing: "You are eliminated - watching as spectator",
                    responsePhaseHeader: "Response Phase",
                    votingPhaseHeader: "Voting Phase",
                    resultsHeader: "Round Results",
                    placeholder: "Enter your response here...",
                    spectatorPlaceholder: "You are eliminated - watching as spectator"
                },
                results: {
                    eliminated: "{{name}} was eliminated!",
                    wasAI: "🎉 It was the AI! Good job!",
                    wasHuman: "😬 It was a human player...",
                    noElimination: "No one was eliminated this round",
                    notEnoughVotes: "Not enough votes to eliminate anyone",
                    voteSummary: "Vote Summary:",
                    votes: "votes"
                },
                gameOver: {
                    aiWins: "🤖 The AI Wins!",
                    humansWin: "👥 Humans Win!",
                    finalResults: "Final Results:",
                    survived: "Survived",
                    eliminated: "Eliminated",
                    ai: "🤖 AI",
                    human: "👤 Human",
                    newGameSameRoom: "New Game (Same Room)",
                    leaveRoom: "Leave Room"
                },
                messages: {
                    roomCreated: "Room created! Code: {{code}}",
                    joinedRoom: "Successfully joined room!",
                    connectedToGame: "Connected to game",
                    disconnectedFromGame: "Disconnected from game",
                    connectionError: "Connection error",
                    playerJoined: "A player joined the game",
                    leftRoom: "Left the room",
                    roomReset: "Room reset! Ready for a new game",
                    gameStarted: "Game started!",
                    responseSubmitted: "Response submitted!",
                    voteSubmitted: "Vote submitted!",
                    timeUp: "Time is up! Waiting for other players...",
                    voteSkipped: "Time is up! Your vote was skipped.",
                    roomCodeCopied: "Room code copied!",
                    couldNotCopy: "Could not copy room code",
                    reconnected: "Reconnected to game",
                    couldNotReconnect: "Could not reconnect to previous game",
                    startingNewGame: "Starting new game...",
                    // Error messages
                    enterName: "Please enter your name",
                    enterRoomCode: "Please enter room code",
                    enterResponse: "Please enter a response",
                    responseMinLength: "Response must be at least 10 characters",
                    responseMaxLength: "Response must be 180 characters or less",
                    failedToCreate: "Failed to create room",
                    failedToJoin: "Failed to join room",
                    roomNotFound: "Room not found",
                    failedToStart: "Failed to start game",
                    failedToReset: "Failed to start new game"
                }
            },
            
            de: {
                meta: {
                    title: "Bot oder Nicht - Soziales Deduktionsspiel"
                },
                welcome: {
                    title: "🤖 Bot oder Nicht",
                    subtitle: "Kannst du die KI unter deinen Freunden erkennen?",
                    gameInfo: "👥 2-8 Spieler • 🎯 Finde die KI • 💭 Kreative Antworten",
                    howToPlay: "Spielanleitung:",
                    rules: [
                        "🤖 Eine KI-Spieler tritt 2-8 Menschen in jedem Spiel bei",
                        "📝 Alle antworten auf kreative Eingabeaufforderungen (140-180 Zeichen)",
                        "🗳️ Stimme ab, um den verdächtigsten Spieler jede Runde zu eliminieren",
                        "🏆 Menschen gewinnen, indem sie die KI finden • KI gewinnt, indem sie die letzten 2 erreicht",
                        "⏱️ Jede Runde: 60s zum Antworten + 60s zum Abstimmen"
                    ],
                    createRoom: "Raum Erstellen",
                    joinRoom: "Raum Beitreten"
                },
                form: {
                    enterName: "Gib deinen Namen ein",
                    enterRoomCode: "Raumcode eingeben (z.B. 123456)",
                    continue: "Weiter",
                    selectLanguage: "Sprache Wählen"
                },
                lobby: {
                    title: "Spiel-Lobby",
                    shareCode: "Teile diesen Raumcode mit Freunden:",
                    copy: "📋 Kopieren",
                    shareInstruction: "Freunde können beitreten, indem sie auf \"Raum beitreten\" auf der Hauptseite klicken und diesen Code eingeben.",
                    playersCount: "Spieler",
                    startGame: "Spiel Starten",
                    leaveRoom: "Raum Verlassen",
                    needPlayers: "Benötige mindestens {{min}} Spieler zum Starten",
                    readyToStart: "Bereit zum Starten!",
                    playerStatus: {
                        ready: "Bereit",
                        eliminated: "Eliminiert"
                    }
                },
                game: {
                    round: "Runde",
                    responsePhase: "Antwortphase",
                    votingPhase: "Abstimmungsphase",
                    results: "Ergebnisse",
                    playersAlive: "Spieler leben",
                    prompt: "Aufforderung:",
                    submitResponse: "Antwort Einreichen",
                    waitingForPlayers: "Warten auf andere Spieler...",
                    responsesSubmitted: "{{count}}/{{total}} Antworten eingereicht",
                    characters: "Zeichen",
                    votingHeader: "Klicken Sie auf eine Antwort, um diesen Spieler zu wählen:",
                    spectatorNote: "Sie sehen als Zuschauer zu",
                    yourResponse: "(Ihre Antwort)",
                    clickToVoteKick: "Klicken Sie, um zu wählen",
                    responsesMissing: "Sie sind eliminiert - sehen als Zuschauer zu",
                    responsePhaseHeader: "Antwortphase",
                    votingPhaseHeader: "Abstimmungsphase",
                    resultsHeader: "Rundenergebnisse",
                    placeholder: "Geben Sie hier Ihre Antwort ein...",
                    spectatorPlaceholder: "Sie sind eliminiert - sehen als Zuschauer zu"
                },
                results: {
                    eliminated: "{{name}} wurde eliminiert!",
                    wasAI: "🎉 Es war die KI! Gute Arbeit!",
                    wasHuman: "😬 Es war ein menschlicher Spieler...",
                    noElimination: "Niemand wurde in dieser Runde eliminiert",
                    notEnoughVotes: "Nicht genug Stimmen, um jemanden zu eliminieren",
                    voteSummary: "Stimmzusammenfassung:",
                    votes: "Stimmen"
                },
                gameOver: {
                    aiWins: "🤖 Die KI gewinnt!",
                    humansWin: "👥 Die Menschen gewinnen!",
                    finalResults: "Endergebnisse:",
                    survived: "Überlebt",
                    eliminated: "Eliminiert",
                    ai: "🤖 KI",
                    human: "👤 Mensch",
                    newGameSameRoom: "Neues Spiel (Gleicher Raum)",
                    leaveRoom: "Raum Verlassen"
                },
                messages: {
                    roomCreated: "Raum erstellt! Code: {{code}}",
                    joinedRoom: "Erfolgreich dem Raum beigetreten!",
                    connectedToGame: "Mit dem Spiel verbunden",
                    disconnectedFromGame: "Von Spiel getrennt",
                    connectionError: "Verbindungsfehler",
                    playerJoined: "Ein Spieler hat sich dem Spiel angeschlossen",
                    leftRoom: "Den Raum verlassen",
                    roomReset: "Raum zurückgesetzt! Bereit für ein neues Spiel",
                    gameStarted: "Spiel gestartet!",
                    responseSubmitted: "Antwort eingereicht!",
                    voteSubmitted: "Stimme abgegeben!",
                    timeUp: "Die Zeit ist abgelaufen! Warte auf andere Spieler...",
                    voteSkipped: "Die Zeit ist abgelaufen! Ihre Stimme wurde übersprungen.",
                    roomCodeCopied: "Raumcode kopiert!",
                    couldNotCopy: "Raumcode konnte nicht kopiert werden",
                    reconnected: "Wieder mit dem Spiel verbunden",
                    couldNotReconnect: "Konnte nicht mit dem vorherigen Spiel verbinden",
                    startingNewGame: "Starte ein neues Spiel...",
                    // Error messages
                    enterName: "Bitte geben Sie Ihren Namen ein",
                    enterRoomCode: "Bitte geben Sie den Raumcode ein",
                    enterResponse: "Bitte geben Sie eine Antwort ein",
                    responseMinLength: "Die Antwort muss mindestens 10 Zeichen lang sein",
                    responseMaxLength: "Die Antwort darf maximal 180 Zeichen lang sein",
                    failedToCreate: "Raum konnte nicht erstellt werden",
                    failedToJoin: "Beitritt zum Raum fehlgeschlagen",
                    roomNotFound: "Raum nicht gefunden",
                    failedToStart: "Spiel konnte nicht gestartet werden",
                    failedToReset: "Neues Spiel konnte nicht gestartet werden"
                }
            },
            
            es: {
                meta: {
                    title: "Bot o No - Juego de Deducción Social"
                },
                welcome: {
                    title: "🤖 Bot o No",
                    subtitle: "¿Puedes detectar la IA entre tus amigos?",
                    gameInfo: "👥 2-8 jugadores • 🎯 Encuentra la IA • 💭 Respuestas creativas",
                    howToPlay: "Cómo Jugar:",
                    rules: [
                        "🤖 Un jugador IA se une a 2-8 humanos en cada juego",
                        "📝 Todos responden a indicaciones creativas (140-180 caracteres)",
                        "🗳️ Vota para eliminar al jugador más sospechoso cada ronda",
                        "🏆 Los humanos ganan encontrando la IA • La IA gana llegando a los últimos 2",
                        "⏱️ Cada ronda: 60s para responder + 60s para votar"
                    ],
                    createRoom: "Crear Sala",
                    joinRoom: "Unirse a Sala"
                },
                form: {
                    enterName: "Ingresa tu nombre",
                    enterRoomCode: "Ingresa el código de la sala (p. ej., 123456)",
                    continue: "Continuar",
                    selectLanguage: "Seleccionar idioma del juego"
                },
                lobby: {
                    title: "Lobby del Juego",
                    shareCode: "Comparte este código de sala con amigos:",
                    copy: "📋 Copiar",
                    shareInstruction: "Los amigos pueden unirse haciendo clic en \"Unirse a Sala\" en la página principal e ingresando este código.",
                    playersCount: "Jugadores",
                    startGame: "Iniciar Juego",
                    leaveRoom: "Salir de la Sala",
                    needPlayers: "Se necesitan al menos {{min}} jugadores para comenzar",
                    readyToStart: "¡Listo para comenzar!",
                    playerStatus: {
                        ready: "Listo",
                        eliminated: "Eliminado"
                    }
                },
                game: {
                    round: "Ronda",
                    responsePhase: "Fase de Respuestas",
                    votingPhase: "Fase de Votación",
                    results: "Resultados",
                    playersAlive: "jugadores vivos",
                    prompt: "Sugerencia:",
                    submitResponse: "Enviar Respuesta",
                    waitingForPlayers: "Esperando a otros jugadores...",
                    responsesSubmitted: "{{count}}/{{total}} respuestas enviadas",
                    characters: "caracteres",
                    votingHeader: "Haz clic en una respuesta para votar por la EXPULSIÓN de ese jugador:",
                    spectatorNote: "Estás viendo como espectador",
                    yourResponse: "(Tu respuesta)",
                    clickToVoteKick: "Haz clic para votar EXPULSAR",
                    responsesMissing: "Estás eliminado - viendo como espectador",
                    responsePhaseHeader: "Fase de Respuestas",
                    votingPhaseHeader: "Fase de Votación",
                    resultsHeader: "Resultados de la Ronda",
                    placeholder: "Ingresa tu respuesta aquí...",
                    spectatorPlaceholder: "Estás eliminado - viendo como espectador"
                },
                results: {
                    eliminated: "{{name}} fue eliminado!",
                    wasAI: "🎉 ¡Era la IA! ¡Buen trabajo!",
                    wasHuman: "😬 Era un jugador humano...",
                    noElimination: "Nadie fue eliminado en esta ronda",
                    notEnoughVotes: "No hay suficientes votos para eliminar a alguien",
                    voteSummary: "Resumen de Votos:",
                    votes: "votos"
                },
                gameOver: {
                    aiWins: "🤖 ¡La IA Gana!",
                    humansWin: "👥 ¡Los Humanos Ganan!",
                    finalResults: "Resultados Finales:",
                    survived: "Sobrevivió",
                    eliminated: "Eliminado",
                    ai: "🤖 IA",
                    human: "👤 Humano",
                    newGameSameRoom: "Nuevo Juego (Misma Sala)",
                    leaveRoom: "Salir de la Sala"
                },
                messages: {
                    roomCreated: "¡Sala creada! Código: {{code}}",
                    joinedRoom: "¡Unido a la sala con éxito!",
                    connectedToGame: "Conectado al juego",
                    disconnectedFromGame: "Desconectado del juego",
                    connectionError: "Error de conexión",
                    playerJoined: "Un jugador se unió al juego",
                    leftRoom: "Salió de la sala",
                    roomReset: "¡Sala reiniciada! Listo para un nuevo juego",
                    gameStarted: "¡Juego comenzado!",
                    responseSubmitted: "¡Respuesta enviada!",
                    voteSubmitted: "¡Voto enviado!",
                    timeUp: "¡Se acabó el tiempo! Esperando a otros jugadores...",
                    voteSkipped: "Se acabó el tiempo. Tu voto fue omitido.",
                    roomCodeCopied: "¡Código de sala copiado!",
                    couldNotCopy: "No se pudo copiar el código de la sala",
                    reconnected: "Reconectado al juego",
                    couldNotReconnect: "No se pudo reconectar al juego anterior",
                    startingNewGame: "Iniciando un nuevo juego...",
                    // Error messages
                    enterName: "Por favor ingresa tu nombre",
                    enterRoomCode: "Por favor ingresa el código de la sala",
                    enterResponse: "Por favor ingresa una respuesta",
                    responseMinLength: "La respuesta debe tener al menos 10 caracteres",
                    responseMaxLength: "La respuesta debe tener 180 caracteres o menos",
                    failedToCreate: "Error al crear la sala",
                    failedToJoin: "Error al unirse a la sala",
                    roomNotFound: "Sala no encontrada",
                    failedToStart: "Error al iniciar el juego",
                    failedToReset: "Error al iniciar un nuevo juego"
                }
            },
            
            fr: {
                meta: {
                    title: "Bot ou Pas - Jeu de Déduction Sociale"
                },
                welcome: {
                    title: "🤖 Bot ou Pas",
                    subtitle: "Peux-tu repérer l'IA parmi tes amis?",
                    gameInfo: "👥 2-8 joueurs • 🎯 Trouve l'IA • 💭 Réponses créatives",
                    howToPlay: "Comment Jouer:",
                    rules: [
                        "🤖 Un joueur IA rejoint 2-8 humains dans chaque partie",
                        "📝 Tout le monde répond à des invites créatives (140-180 caractères)",
                        "🗳️ Vote pour éliminer le joueur le plus suspect à chaque tour",
                        "🏆 Les humains gagnent en trouvant l'IA • L'IA gagne en atteignant les 2 derniers",
                        "⏱️ Chaque tour: 60s pour répondre + 60s pour voter"
                    ],
                    createRoom: "Créer Salle",
                    joinRoom: "Rejoindre Salle"
                },
                form: {
                    enterName: "Entrez votre nom",
                    enterRoomCode: "Entrez le code de la salle (ex. 123456)",
                    continue: "Continuer",
                    selectLanguage: "Sélectionner la langue du jeu"
                },
                lobby: {
                    title: "Lobby du Jeu",
                    shareCode: "Partagez ce code de salle avec vos amis :",
                    copy: "📋 Copier",
                    shareInstruction: "Les amis peuvent rejoindre en cliquant sur \"Rejoindre Salle\" sur la page principale et en entrant ce code.",
                    playersCount: "Joueurs",
                    startGame: "Démarrer le Jeu",
                    leaveRoom: "Quitter la Salle",
                    needPlayers: "Besoin d'au moins {{min}} joueurs pour commencer",
                    readyToStart: "Prêt à commencer!",
                    playerStatus: {
                        ready: "Prêt",
                        eliminated: "Éliminé"
                    }
                },
                game: {
                    round: "Tour",
                    responsePhase: "Phase de Réponse",
                    votingPhase: "Phase de Vote",
                    results: "Résultats",
                    playersAlive: "joueurs vivants",
                    prompt: "Invite:",
                    submitResponse: "Soumettre la Réponse",
                    waitingForPlayers: "En attente des autres joueurs...",
                    responsesSubmitted: "{{count}}/{{total}} réponses soumises",
                    characters: "caractères",
                    votingHeader: "Cliquez sur une réponse pour voter pour l'EXPULSION de ce joueur :",
                    spectatorNote: "Vous regardez en tant que spectateur",
                    yourResponse: "(Votre réponse)",
                    clickToVoteKick: "Cliquez pour voter EXPULSER",
                    responsesMissing: "Vous êtes éliminé - regardez en tant que spectateur",
                    responsePhaseHeader: "Phase de Réponse",
                    votingPhaseHeader: "Phase de Vote",
                    resultsHeader: "Résultats du Tour",
                    placeholder: "Entrez votre réponse ici...",
                    spectatorPlaceholder: "Vous êtes éliminé - regardez en tant que spectateur"
                },
                results: {
                    eliminated: "{{name}} a été éliminé!",
                    wasAI: "🎉 C'était l'IA! Bon travail!",
                    wasHuman: "😬 C'était un joueur humain...",
                    noElimination: "Personne n'a été éliminé ce tour",
                    notEnoughVotes: "Pas assez de votes pour éliminer quelqu'un",
                    voteSummary: "Résumé des Votes:",
                    votes: "votes"
                },
                gameOver: {
                    aiWins: "🤖 L'IA Gagne!",
                    humansWin: "👥 Les Humains Gagnent!",
                    finalResults: "Résultats Finaux:",
                    survived: "Survécu",
                    eliminated: "Éliminé",
                    ai: "🤖 IA",
                    human: "👤 Humain",
                    newGameSameRoom: "Nouvelle Partie (Même Salle)",
                    leaveRoom: "Quitter la Salle"
                },
                messages: {
                    roomCreated: "Salle créée! Code: {{code}}",
                    joinedRoom: "Rejoint avec succès la salle!",
                    connectedToGame: "Connecté au jeu",
                    disconnectedFromGame: "Déconnecté du jeu",
                    connectionError: "Erreur de connexion",
                    playerJoined: "Un joueur a rejoint le jeu",
                    leftRoom: "A quitté la salle",
                    roomReset: "Salle réinitialisée! Prêt pour une nouvelle partie",
                    gameStarted: "Partie commencée!",
                    responseSubmitted: "Réponse soumise!",
                    voteSubmitted: "Vote soumis!",
                    timeUp: "Le temps est écoulé! En attente des autres joueurs...",
                    voteSkipped: "Le temps est écoulé! Votre vote a été sauté.",
                    roomCodeCopied: "Code de salle copié!",
                    couldNotCopy: "Impossible de copier le code de la salle",
                    reconnected: "Reconnecté au jeu",
                    couldNotReconnect: "Impossible de se reconnecter au jeu précédent",
                    startingNewGame: "Démarrage d'une nouvelle partie...",
                    // Error messages
                    enterName: "Veuillez entrer votre nom",
                    enterRoomCode: "Veuillez entrer le code de la salle",
                    enterResponse: "Veuillez entrer une réponse",
                    responseMinLength: "La réponse doit comporter au moins 10 caractères",
                    responseMaxLength: "La réponse doit comporter 180 caractères ou moins",
                    failedToCreate: "Échec de la création de la salle",
                    failedToJoin: "Échec de rejoindre la salle",
                    roomNotFound: "Salle non trouvée",
                    failedToStart: "Échec du démarrage du jeu",
                    failedToReset: "Échec du démarrage d'une nouvelle partie"
                }
            },
            
            ru: {
                meta: {
                    title: "Бот или Нет - Социальная Игра-Детектив"
                },
                welcome: {
                    title: "🤖 Бот или Нет",
                    subtitle: "Сможешь ли ты распознать ИИ среди своих друзей?",
                    gameInfo: "👥 2-8 игроков • 🎯 Найди ИИ • 💭 Креативные ответы",
                    howToPlay: "Как Играть:",
                    rules: [
                        "🤖 Один ИИ-игрок присоединяется к 2-8 людям в каждой игре",
                        "📝 Все отвечают на креативные подсказки (140-180 символов)",
                        "🗳️ Голосуй за исключение самого подозрительного игрока каждый раунд",
                        "🏆 Люди побеждают, найдя ИИ • ИИ побеждает, дойдя до финальной двойки",
                        "⏱️ Каждый раунд: 60с на ответ + 60с на голосование"
                    ],
                    createRoom: "Создать Комнату",
                    joinRoom: "Присоединиться"
                },
                form: {
                    enterName: "Введите ваше имя",
                    enterRoomCode: "Введите код комнаты (например, 123456)",
                    continue: "Продолжить",
                    selectLanguage: "Выберите язык игры",
                    languageNote: "Язык игры будет соответствовать языку интерфейса"
                },
                lobby: {
                    title: "Лобби игры",
                    shareCode: "Поделитесь этим кодом комнаты с друзьями:",
                    copy: "📋 Копировать",
                    shareInstruction: "Друзья могут присоединиться, нажав \"Присоединиться\" на главной странице и введя этот код.",
                    playersCount: "Игроки",
                    startGame: "Начать Игру",
                    leaveRoom: "Покинуть Комнату",
                    needPlayers: "Нужно минимум {{min}} игроков для старта",
                    readyToStart: "Готово к запуску!",
                    playerStatus: {
                        ready: "Готов",
                        eliminated: "Исключен"
                    }
                },
                game: {
                    round: "Раунд",
                    responsePhase: "Фаза Ответов",
                    votingPhase: "Фаза Голосования",
                    results: "Результаты",
                    playersAlive: "игроков живы",
                    prompt: "Вопрос:",
                    submitResponse: "Отправить Ответ",
                    waitingForPlayers: "Ждем других игроков...",
                    responsesSubmitted: "{{count}}/{{total}} ответов отправлено",
                    characters: "символов",
                    responsePhaseHeader: "Фаза Ответов",
                    votingPhaseHeader: "Фаза Голосования",
                    resultsHeader: "Результаты Раунда",
                    placeholder: "Введите ваш ответ здесь...",
                    spectatorPlaceholder: "Вы исключены - наблюдаете как зритель"
                },
                results: {
                    eliminated: "{{name}} был исключен!",
                    wasAI: "🎉 Это был ИИ! Отличная работа!",
                    wasHuman: "😬 Это был человек...",
                    noElimination: "Никто не был исключен в этом раунде",
                    notEnoughVotes: "Недостаточно голосов для исключения",
                    voteSummary: "Итоги Голосования:",
                    votes: "голосов"
                },
                gameOver: {
                    aiWins: "🤖 ИИ Побеждает!",
                    humansWin: "👥 Люди Побеждают!",
                    finalResults: "Финальные Результаты:",
                    survived: "Выжил",
                    eliminated: "Исключен",
                    ai: "🤖 ИИ",
                    human: "👤 Человек",
                    newGameSameRoom: "Новая Игра (Та же Комната)",
                    leaveRoom: "Покинуть Комнату"
                },
                messages: {
                    roomCreated: "Комната создана! Код: {{code}}",
                    joinedRoom: "Успешно присоединились к комнате!",
                    connectedToGame: "Подключен к игре",
                    disconnectedFromGame: "Отключен от игры",
                    connectionError: "Ошибка подключения",
                    playerJoined: "Игрок присоединился к игре",
                    leftRoom: "Покинул комнату",
                    roomReset: "Комната сброшена! Готово к новой игре",
                    gameStarted: "Игра началась!",
                    responseSubmitted: "Ответ отправлен!",
                    voteSubmitted: "Голос отдан!",
                    timeUp: "Время вышло! Ждем других игроков...",
                    voteSkipped: "Время вышло! Ваш голос пропущен.",
                    roomCodeCopied: "Код комнаты скопирован!",
                    couldNotCopy: "Не удалось скопировать код комнаты",
                    failedToCreate: "Не удалось создать комнату",
                    failedToJoin: "Не удалось присоединиться к комнате"
                }
            },
            
            it: {
                meta: {
                    title: "Bot o No - Gioco di Deduzione Sociale"
                },
                welcome: {
                    title: "🤖 Bot o No",
                    subtitle: "Riesci a individuare l'IA tra i tuoi amici?",
                    gameInfo: "👥 2-8 giocatori • 🎯 Trova l'IA • 💭 Risposte creative",
                    howToPlay: "Come Giocare:",
                    rules: [
                        "🤖 Un giocatore IA si unisce a 2-8 umani in ogni partita",
                        "📝 Tutti rispondono a suggerimenti creativi (140-180 caratteri)",
                        "🗳️ Vota per eliminare il giocatore più sospetto ogni round",
                        "🏆 Gli umani vincono trovando l'IA • L'IA vince raggiungendo i 2 finali",
                        "⏱️ Ogni round: 60s per rispondere + 60s per votare"
                    ],
                    createRoom: "Crea Stanza",
                    joinRoom: "Unisciti"
                },
                form: {
                    enterName: "Inserisci il tuo nome",
                    enterRoomCode: "Inserisci codice stanza (es. 123456)",
                    continue: "Continua",
                    selectLanguage: "Seleziona lingua di gioco",
                    languageNote: "La lingua del gioco corrisponderà alla lingua dell'interfaccia"
                },
                lobby: {
                    title: "Lobby di Gioco",
                    shareCode: "Condividi questo codice con gli amici:",
                    copy: "📋 Copia",
                    shareInstruction: "Gli amici possono unirsi cliccando \"Unisciti\" nella pagina principale e inserendo questo codice.",
                    playersCount: "Giocatori",
                    startGame: "Inizia Partita",
                    leaveRoom: "Lascia Stanza",
                    needPlayers: "Servono almeno {{min}} giocatori per iniziare",
                    readyToStart: "Pronto per iniziare!",
                    playerStatus: {
                        ready: "Pronto",
                        eliminated: "Eliminato"
                    }
                },
                game: {
                    round: "Round",
                    responsePhase: "Fase Risposta",
                    votingPhase: "Fase Voto",
                    results: "Risultati",
                    playersAlive: "giocatori vivi",
                    prompt: "Domanda:",
                    submitResponse: "Invia Risposta",
                    waitingForPlayers: "Aspettando altri giocatori...",
                    responsesSubmitted: "{{count}}/{{total}} risposte inviate",
                    characters: "caratteri",
                    responsePhaseHeader: "Fase Risposta",
                    votingPhaseHeader: "Fase Voto",
                    resultsHeader: "Risultati Round",
                    placeholder: "Scrivi la tua risposta qui...",
                    spectatorPlaceholder: "Sei stato eliminato - stai guardando come spettatore"
                },
                results: {
                    eliminated: "{{name}} è stato eliminato!",
                    wasAI: "🎉 Era l'IA! Ben fatto!",
                    wasHuman: "😬 Era un giocatore umano...",
                    noElimination: "Nessuno è stato eliminato questo round",
                    notEnoughVotes: "Non abbastanza voti per eliminare",
                    voteSummary: "Riassunto Voti:",
                    votes: "voti"
                },
                gameOver: {
                    aiWins: "🤖 L'IA Vince!",
                    humansWin: "👥 Gli Umani Vincono!",
                    finalResults: "Risultati Finali:",
                    survived: "Sopravvissuto",
                    eliminated: "Eliminato",
                    ai: "🤖 IA",
                    human: "👤 Umano",
                    newGameSameRoom: "Nuova Partita (Stessa Stanza)",
                    leaveRoom: "Lascia Stanza"
                },
                messages: {
                    roomCreated: "Stanza creata! Codice: {{code}}",
                    joinedRoom: "Ti sei unito con successo!",
                    connectedToGame: "Connesso al gioco",
                    disconnectedFromGame: "Disconnesso dal gioco",
                    connectionError: "Errore di connessione",
                    playerJoined: "Un giocatore si è unito",
                    leftRoom: "Hai lasciato la stanza",
                    roomReset: "Stanza resettata! Pronto per una nuova partita",
                    gameStarted: "Partita iniziata!",
                    responseSubmitted: "Risposta inviata!",
                    voteSubmitted: "Voto inviato!",
                    timeUp: "Tempo scaduto! Aspettando altri giocatori...",
                    voteSkipped: "Tempo scaduto! Il tuo voto è stato saltato.",
                    roomCodeCopied: "Codice stanza copiato!",
                    couldNotCopy: "Impossibile copiare il codice",
                    failedToCreate: "Impossibile creare la stanza",
                    failedToJoin: "Impossibile unirsi alla stanza"
                }
            }

            // Add similar complete translations for de, es, fr...
        };
    }
}

// Create global i18n instance
window.i18n = new I18n();
