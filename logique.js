document.addEventListener('DOMContentLoaded', function() {
    // Configuration du jeu
    const CONFIG = {
        arenaSize: 7,
        heroTypes: {
            knight: { 
                health: 120, 
                baseDamage: 30, 
                moveRange: 1, 
                attackRange: 1,
                specialCooldown: 3, 
                color: '#8B4513',
                specialName: "Cri de guerre"
            },
            ninja: { 
                health: 90, 
                baseDamage: 20,
                moveRange: 2, 
                attackRange: 1,
                dodgeChance: 0.5, 
                specialCooldown: 3, 
                color: '#2c3e50',
                specialName: "Double attaque"
            },
            wizard: { 
                health: 80, 
                baseDamage: 25,
                moveRange: 1, 
                attackRange: 3,
                specialCooldown: 3, 
                color: '#6A0DAD',
                specialName: "Tempête magique"
            }
        },
        attackTypes: {
            fast: { multiplier: 0.8, priority: 1 },
            normal: { multiplier: 1, priority: 0 },
            heavy: { multiplier: 1.5, priority: -1 }
        },
        bonusEffects: {
            health: { value: 20, message: "+20 HP" },
            damage: { value: 5, message: "+5 dégâts" },
            range: { value: 1, message: "+1 portée" }
        }
    };

    // Éléments UI
    const UI = {
        screens: {
            welcome: document.getElementById('welcome-screen'),
            heroSelect: document.getElementById('hero-selection'),
            arena: document.getElementById('arena-container'),
            endGame: document.getElementById('end-game-screen')
        },
        buttons: {
            startGame: document.getElementById('start-game-btn'),
            selectHero: document.querySelectorAll('.select-hero-btn'),
            move: document.getElementById('move-btn'),
            fastAttack: document.getElementById('fast-attack-btn'),
            heavyAttack: document.getElementById('heavy-attack-btn'),
            special: document.getElementById('special-btn'),
            defend: document.getElementById('defend-btn'),
            dodge: document.getElementById('dodge-btn'),
            endTurn: document.getElementById('end-turn-btn'),
            restart: document.getElementById('restart-game-btn')
        },
        arena: document.getElementById('arena-grid'),
        currentPlayer: document.getElementById('current-player'),
        playerStats: document.getElementById('player-stats'),
        combatLog: document.querySelector('.log-entries'),
        winnerDisplay: document.getElementById('winner-display'),
        p1SelectionDisplay: document.getElementById('p1-selection-display'),
        p1HeroName: document.getElementById('p1-hero-name'),
        p2HeroName: document.getElementById('p2-hero-name')
    };

    // État du jeu
    const gameState = {
        players: [],
        currentPlayerIndex: 0,
        selectedHeroes: { player1: null, player2: null },
        obstacles: [],
        bonuses: [],
        pendingActions: {},
        turnCount: 0,
        selectionPhase: 'player1' // 'player1' ou 'player2'
    };

    /* Initialisation du jeu */
    function init() {
        setupEventListeners();
        showScreen('welcome');
    }

    function setupEventListeners() {
        // Navigation
        UI.buttons.startGame.addEventListener('click', () => {
            showScreen('heroSelect');
            updateHeroSelectionUI();
        });
        
        UI.buttons.restart.addEventListener('click', resetGame);

        // Sélection des héros
        UI.buttons.selectHero.forEach(btn => {
            btn.addEventListener('click', function() {
                const heroType = this.parentElement.getAttribute('data-hero');
                
                if (gameState.selectionPhase === 'player1') {
                    gameState.selectedHeroes.player1 = heroType;
                    gameState.selectionPhase = 'player2';
                    updateHeroSelectionUI();
                } else {
                    gameState.selectedHeroes.player2 = heroType;
                    startGame();
                }
            });
        });

        // Actions de jeu
        UI.buttons.move.addEventListener('click', () => prepareAction('move'));
        UI.buttons.fastAttack.addEventListener('click', () => prepareAttack('fast'));
        UI.buttons.heavyAttack.addEventListener('click', () => prepareAttack('heavy'));
        UI.buttons.special.addEventListener('click', () => prepareAction('special'));
        UI.buttons.defend.addEventListener('click', () => prepareAction('defend'));
        UI.buttons.dodge.addEventListener('click', () => prepareAction('dodge'));
        UI.buttons.endTurn.addEventListener('click', endTurn);

        // Clic sur les cellules
        UI.arena.addEventListener('click', (e) => {
            if (e.target.classList.contains('cell')) {
                handleCellClick(e.target);
            }
        });
    }

    /* Gestion des écrans */
    function showScreen(screenName) {
        Object.values(UI.screens).forEach(screen => screen.style.display = 'none');
        UI.screens[screenName].style.display = 'flex';
    }

    /* Mise à jour de l'interface de sélection des héros */
    function updateHeroSelectionUI() {
        const title = document.querySelector('#hero-selection h2');
        const selectionInfo = document.querySelector('.selection-info');
        
        if (gameState.selectionPhase === 'player1') {
            title.textContent = 'JOUEUR 1 - CHOISISSEZ VOTRE HÉROS';
            selectionInfo.style.display = 'none';
        } else {
            title.textContent = 'JOUEUR 2 - CHOISISSEZ VOTRE HÉROS';
            selectionInfo.style.display = 'block';
            UI.p1SelectionDisplay.textContent = gameState.selectedHeroes.player1;
        }
    }

    /* Démarrage du jeu */
    function startGame() {
        resetGameState();
        generateArena();
        generateObstacles();
        generateBonuses();
        createPlayers();
        showScreen('arena');
        startTurn();
    }

    function resetGame() {
        gameState.selectionPhase = 'player1';
        showScreen('welcome');
        resetGameState();
    }

    function resetGameState() {
        gameState.players = [];
        gameState.currentPlayerIndex = 0;
        gameState.obstacles = [];
        gameState.bonuses = [];
        gameState.pendingActions = {};
        gameState.turnCount = 0;
        UI.combatLog.innerHTML = '';
    }

    /* Génération de l'arène */
    function generateArena() {
        UI.arena.innerHTML = '';
        UI.arena.style.gridTemplateColumns = `repeat(${CONFIG.arenaSize}, 1fr)`;

        for (let i = 0; i < CONFIG.arenaSize * CONFIG.arenaSize; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = Math.floor(i / CONFIG.arenaSize);
            cell.dataset.col = i % CONFIG.arenaSize;
            UI.arena.appendChild(cell);
        }
    }

    function generateObstacles() {
        const obstacleCount = Math.floor(CONFIG.arenaSize * CONFIG.arenaSize * 0.1);
        
        for (let i = 0; i < obstacleCount; i++) {
            let row, col;
            do {
                row = Math.floor(Math.random() * CONFIG.arenaSize);
                col = Math.floor(Math.random() * CONFIG.arenaSize);
            } while (isCornerPosition(row, col) || isPositionOccupied(row, col));
            
            gameState.obstacles.push({ row, col });
        }
    }

    function generateBonuses() {
        const bonusCount = Math.floor(CONFIG.arenaSize * CONFIG.arenaSize * 0.05);
        const bonusTypes = Object.keys(CONFIG.bonusEffects);
        
        for (let i = 0; i < bonusCount; i++) {
            let row, col;
            do {
                row = Math.floor(Math.random() * CONFIG.arenaSize);
                col = Math.floor(Math.random() * CONFIG.arenaSize);
            } while (isCornerPosition(row, col) || isPositionOccupied(row, col));
            
            gameState.bonuses.push({
                row,
                col,
                type: bonusTypes[Math.floor(Math.random() * bonusTypes.length)]
            });
        }
    }

    function createPlayers() {
        const cornerPositions = [
            {row: 0, col: 0},
            {row: 0, col: CONFIG.arenaSize - 1},
            {row: CONFIG.arenaSize - 1, col: 0},
            {row: CONFIG.arenaSize - 1, col: CONFIG.arenaSize - 1}
        ];

        // Joueur 1
        gameState.players.push(createHero(
            gameState.selectedHeroes.player1, 
            cornerPositions[0].row, 
            cornerPositions[0].col, 
            'Joueur 1'
        ));

        // Joueur 2
        gameState.players.push(createHero(
            gameState.selectedHeroes.player2, 
            cornerPositions[1].row, 
            cornerPositions[1].col, 
            'Joueur 2'
        ));

        // Mettre à jour les noms dans l'UI
        UI.p1HeroName.textContent = gameState.selectedHeroes.player1;
        UI.p2HeroName.textContent = gameState.selectedHeroes.player2;
    }

    function createHero(type, row, col, name) {
        const heroConfig = CONFIG.heroTypes[type];
        return {
            type,
            name,
            row,
            col,
            health: heroConfig.health,
            maxHealth: heroConfig.health,
            baseDamage: heroConfig.baseDamage,
            attackDamage: heroConfig.baseDamage,
            attackRange: heroConfig.attackRange,
            moveRange: heroConfig.moveRange,
            specialCooldown: 0,
            isDefending: false,
            dodging: false,
            dodgeChance: heroConfig.dodgeChance || 0,
            color: heroConfig.color,
            specialName: heroConfig.specialName
        };
    }

    /* Gestion des tours */
    function startTurn() {
        const currentPlayer = getCurrentPlayer();
        
        // Réinitialiser l'état
        currentPlayer.isDefending = false;
        currentPlayer.dodging = false;
        
        // Réduire le cooldown spécial
        if (currentPlayer.specialCooldown > 0) {
            currentPlayer.specialCooldown--;
        }

        // Mettre à jour l'UI
        updateUI();
        
        // Vérifier les conditions de victoire
        if (checkWinCondition()) return;
    }

    function endTurn() {
        gameState.turnCount++;
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
        startTurn();
    }

    function checkWinCondition() {
        const alivePlayers = gameState.players.filter(p => p.health > 0);
        
        if (alivePlayers.length === 1) {
            endGame(alivePlayers[0]);
            return true;
        } else if (alivePlayers.length === 0) {
            endGame(null); // Match nul
            return true;
        }
        return false;
    }

    function endGame(winner) {
        if (winner) {
            UI.winnerDisplay.textContent = `${winner.name} (${winner.type}) a gagné la partie!`;
        } else {
            UI.winnerDisplay.textContent = "Match nul!";
        }
        showScreen('endGame');
        logMessage(`Fin de la partie! ${winner ? winner.name + ' l\'emporte!' : 'Match nul!'}`, true);
    }

    /* Gestion des actions */
    function prepareAction(actionType) {
        const currentPlayer = getCurrentPlayer();
        gameState.pendingActions[currentPlayer.name] = { 
            type: actionType, 
            player: currentPlayer 
        };
        logMessage(`${currentPlayer.name} prépare: ${getActionName(actionType)}`);
    }

    function prepareAttack(attackType) {
        const currentPlayer = getCurrentPlayer();
        gameState.pendingActions[currentPlayer.name] = { 
            type: 'attack', 
            attackType: attackType, 
            player: currentPlayer 
        };
        logMessage(`${currentPlayer.name} prépare une attaque ${attackType}`);
    }

    function getActionName(actionType) {
        const names = {
            'move': 'Déplacement',
            'attack': 'Attaque',
            'special': 'Pouvoir spécial',
            'defend': 'Défense',
            'dodge': 'Esquive'
        };
        return names[actionType] || actionType;
    }

    function handleCellClick(cell) {
        const currentPlayer = getCurrentPlayer();
        const action = gameState.pendingActions[currentPlayer.name];
        
        if (!action) {
            logMessage("Veuillez d'abord choisir une action");
            return;
        }

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        switch(action.type) {
            case 'move':
                handleMoveAction(row, col, currentPlayer);
                break;
            case 'attack':
                handleAttackAction(row, col, currentPlayer, action.attackType);
                break;
            case 'special':
                handleSpecialAction(row, col, currentPlayer);
                break;
            case 'defend':
                executeDefend(currentPlayer);
                break;
            case 'dodge':
                executeDodge(currentPlayer);
                break;
        }
    }

    function handleMoveAction(row, col, player) {
        if (!isValidMove(row, col, player)) {
            logMessage("Déplacement impossible!");
            return;
        }

        // Vérifier les bonus
        const bonusIndex = gameState.bonuses.findIndex(b => b.row === row && b.col === col);
        if (bonusIndex !== -1) {
            applyBonus(player, gameState.bonuses[bonusIndex]);
        }

        // Déplacer le joueur
        player.row = row;
        player.col = col;
        
        logMessage(`${player.name} se déplace en (${row}, ${col})`);
        updateUI();
        endTurn();
    }

    function handleAttackAction(row, col, player, attackType) {
        const target = gameState.players.find(p => p.row === row && p.col === col && p !== player);
        
        if (!target) {
            logMessage("Aucune cible valide!");
            return;
        }

        // Vérifier la portée
        const distance = getDistance(player, target);
        if (distance > player.attackRange) {
            logMessage("Cible hors de portée!");
            return;
        }

        // Exécuter l'attaque
        executeAttack({
            player,
            target,
            attackType,
            isDoubleAttack: false
        });
        endTurn();
    }

    function handleSpecialAction(row, col, player) {
        if (player.specialCooldown > 0) {
            logMessage("Pouvoir spécial en recharge!");
            return;
        }

        switch(player.type) {
            case 'knight':
                // Cri de guerre
                player.attackDamage = Math.floor(player.baseDamage * 1.5);
                player.specialCooldown = CONFIG.heroTypes.knight.specialCooldown;
                logMessage(`${player.name} utilise ${player.specialName}! Dégâts augmentés!`);
                break;
                
            case 'ninja':
                // Double attaque
                const target = gameState.players.find(p => p.row === row && p.col === col && p !== player);
                if (target) {
                    executeAttack({
                        player,
                        target,
                        attackType: 'fast',
                        isDoubleAttack: true
                    });
                } else {
                    logMessage("Aucune cible valide pour la double attaque!");
                    return;
                }
                break;
                
            case 'wizard':
                // Tempête magique
                const targetCells = getAdjacentCells(row, col);
                let hitCount = 0;
                
                targetCells.forEach(cell => {
                    const target = gameState.players.find(p => p.row === cell.row && p.col === cell.col && p !== player);
                    if (target) {
                        const damage = 15;
                        target.health -= damage;
                        hitCount++;
                        logMessage(`${target.name} subit ${damage} dégâts de la tempête magique!`);
                        
                        if (target.health <= 0) {
                            gameState.players = gameState.players.filter(p => p !== target);
                            logMessage(`${target.name} a été vaincu!`);
                        }
                    }
                });
                
                if (hitCount === 0) {
                    logMessage("La tempête magique n'a touché personne!");
                }
                
                player.specialCooldown = CONFIG.heroTypes.wizard.specialCooldown;
                break;
        }

        updateUI();
        endTurn();
    }

    function executeDefend(player) {
        player.isDefending = true;
        logMessage(`${player.name} se prépare à se défendre!`);
        updateUI();
        endTurn();
    }

    function executeDodge(player) {
        if (player.type !== 'ninja') {
            logMessage("Seul le Ninja peut esquiver!");
            return;
        }
        
        player.dodging = true;
        logMessage(`${player.name} tente d'esquiver la prochaine attaque!`);
        updateUI();
        endTurn();
    }

    function executeAttack({player, target, attackType, isDoubleAttack}) {
        const attackConfig = CONFIG.attackTypes[attackType] || CONFIG.attackTypes.normal;
        let damage = Math.floor(player.attackDamage * attackConfig.multiplier);
        let message = `${player.name} attaque ${target.name} `;
        
        // Vérifier l'esquive
        if (target.dodging && Math.random() < target.dodgeChance) {
            message += `mais ${target.name} esquive l'attaque!`;
            damage = 0;
        } else {
            // Appliquer la défense
            if (target.isDefending) {
                damage = Math.floor(damage / 2);
                message += `(dégâts réduits) `;
            }
            
            // Appliquer les dégâts
            target.health -= damage;
            message += `pour ${damage} dégâts!`;
            
            // Vérifier si la cible est morte
            if (target.health <= 0) {
                gameState.players = gameState.players.filter(p => p !== target);
                message += ` ${target.name} a été vaincu!`;
            }
        }

        logMessage(message);

        // Double attaque
        if (isDoubleAttack && target && target.health > 0) {
            const secondDamage = Math.floor(player.attackDamage * attackConfig.multiplier);
            target.health -= secondDamage;
            logMessage(`Double attaque! ${secondDamage} dégâts supplémentaires!`);
            
            if (target.health <= 0) {
                gameState.players = gameState.players.filter(p => p !== target);
                logMessage(`${target.name} a été vaincu!`);
            }
        }

        updateUI();
    }

    /* Fonctions utilitaires */
    function getCurrentPlayer() {
        return gameState.players[gameState.currentPlayerIndex];
    }

    function isCornerPosition(row, col) {
        return (
            (row === 0 && col === 0) ||
            (row === 0 && col === CONFIG.arenaSize - 1) ||
            (row === CONFIG.arenaSize - 1 && col === 0) ||
            (row === CONFIG.arenaSize - 1 && col === CONFIG.arenaSize - 1)
        );
    }

    function isPositionOccupied(row, col) {
        return gameState.obstacles.some(obs => obs.row === row && obs.col === col) ||
               gameState.bonuses.some(b => b.row === row && b.col === col) ||
               gameState.players.some(p => p.row === row && p.col === col);
    }

    function isValidMove(row, col, player) {
        // Vérifier les limites de l'arène
        if (row < 0 || row >= CONFIG.arenaSize || col < 0 || col >= CONFIG.arenaSize) {
            return false;
        }

        // Vérifier les obstacles
        if (gameState.obstacles.some(obs => obs.row === row && obs.col === col)) {
            return false;
        }

        // Vérifier les autres joueurs
        if (gameState.players.some(p => p.row === row && p.col === col && p !== player)) {
            return false;
        }

        // Vérifier la distance
        const distance = Math.abs(row - player.row) + Math.abs(col - player.col);
        return distance <= player.moveRange;
    }

    function getDistance(player1, player2) {
        return Math.abs(player1.row - player2.row) + Math.abs(player1.col - player2.col);
    }

    function getAdjacentCells(row, col) {
        const cells = [];
        for (let i = row - 1; i <= row + 1; i++) {
            for (let j = col - 1; j <= col + 1; j++) {
                if (i >= 0 && i < CONFIG.arenaSize && j >= 0 && j < CONFIG.arenaSize && !(i === row && j === col)) {
                    cells.push({ row: i, col: j });
                }
            }
        }
        return cells;
    }

    function applyBonus(player, bonus) {
        const effect = CONFIG.bonusEffects[bonus.type];
        
        switch(bonus.type) {
            case 'health':
                player.health = Math.min(player.maxHealth, player.health + effect.value);
                break;
            case 'damage':
                player.baseDamage += effect.value;
                player.attackDamage += effect.value;
                break;
            case 'range':
                if (player.type === 'wizard') {
                    player.attackRange += effect.value;
                }
                break;
        }
        
        logMessage(`${player.name} obtient un bonus: ${effect.message}`);
        gameState.bonuses = gameState.bonuses.filter(b => b !== bonus);
    }

    function logMessage(message, isImportant = false) {
        const entry = document.createElement('p');
        entry.textContent = message;
        if (isImportant) {
            entry.style.fontWeight = 'bold';
            entry.style.color = '#f1c40f';
        }
        UI.combatLog.appendChild(entry);
        UI.combatLog.scrollTop = UI.combatLog.scrollHeight;
    }

    /* Mise à jour de l'interface */
    function updateUI() {
        renderArena();
        updatePlayerStats();
        updateActionButtons();
    }

    function renderArena() {
        const currentPlayer = getCurrentPlayer();
        const cells = document.querySelectorAll('.cell');
        
        cells.forEach(cell => {
            cell.innerHTML = '';
            cell.style.backgroundColor = '';
            cell.style.boxShadow = '';
            cell.classList.remove('obstacle', 'bonus', 'player');

            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);

            // Obstacles
            if (gameState.obstacles.some(obs => obs.row === row && obs.col === col)) {
                cell.classList.add('obstacle');
                const obstacle = document.createElement('div');
                obstacle.className = 'obstacle-icon';
                obstacle.innerHTML = '🪨';
                cell.appendChild(obstacle);
                return;
            }

            // Bonus
            const bonus = gameState.bonuses.find(b => b.row === row && b.col === col);
            if (bonus) {
                cell.classList.add('bonus');
                const bonusElement = document.createElement('div');
                bonusElement.className = `bonus-icon ${bonus.type}`;
                
                const icons = {
                    health: '❤️',
                    damage: '⚔️',
                    range: '🎯'
                };
                bonusElement.textContent = icons[bonus.type] || '✨';
                
                cell.appendChild(bonusElement);
            }

            // Joueurs
            const heroHere = gameState.players.find(p => p.row === row && p.col === col);
            if (heroHere) {
                cell.classList.add('player');
                const heroElement = document.createElement('div');
                heroElement.className = 'hero';
                heroElement.style.backgroundColor = heroHere.color;
                
                const heroIcons = {
                    knight: '♞',
                    ninja: '🥷',
                    wizard: '🧙'
                };
                heroElement.textContent = heroIcons[heroHere.type] || heroHere.name[0];
                
                // Barre de vie
                const healthPercent = Math.max(0, (heroHere.health / heroHere.maxHealth) * 100);
                const healthBar = document.createElement('div');
                healthBar.className = 'health-bar';
                const healthFill = document.createElement('div');
                healthFill.className = 'health-fill';
                healthFill.style.width = `${healthPercent}%`;
                healthBar.appendChild(healthFill);
                heroElement.appendChild(healthBar);
                
                cell.appendChild(heroElement);

                // Mise en évidence du joueur actif
                if (heroHere === currentPlayer) {
                    cell.style.boxShadow = `0 0 15px ${heroHere.color}`;
                }
            }
        });

        // Mettre à jour l'indicateur de tour
        UI.currentPlayer.textContent = `Tour de ${currentPlayer.name} (${currentPlayer.type})`;
        UI.currentPlayer.style.color = currentPlayer.color;
    }

    function updatePlayerStats() {
        const currentPlayer = getCurrentPlayer();
        const otherPlayer = gameState.players.find(p => p !== currentPlayer);
        
        if (!currentPlayer || !otherPlayer) return;

        UI.playerStats.innerHTML = `
            <div class="player-stats">
                <h4>${currentPlayer.name} (VOUS)</h4>
                <p>Type: ${currentPlayer.type}</p>
                <p>Vie: ${currentPlayer.health}/${currentPlayer.maxHealth}</p>
                <p>Dégâts: ${currentPlayer.attackDamage}</p>
                <p>Portée: ${currentPlayer.attackRange}</p>
                <p>Déplacement: ${currentPlayer.moveRange} cases</p>
                ${currentPlayer.specialCooldown > 0 ? 
                  `<p>Pouvoir spécial: Recharge dans ${currentPlayer.specialCooldown} tours</p>` : 
                  `<p>Pouvoir spécial: ${currentPlayer.specialName} (Prêt)</p>`}
            </div>
            <div class="player-stats">
                <h4>${otherPlayer.name}</h4>
                <p>Type: ${otherPlayer.type}</p>
                <p>Vie: ${otherPlayer.health}/${otherPlayer.maxHealth}</p>
                <p>Position: (${otherPlayer.row}, ${otherPlayer.col})</p>
            </div>
        `;
    }

    function updateActionButtons() {
        const currentPlayer = getCurrentPlayer();
        if (!currentPlayer) return;
        
        // Activer tous les boutons pour le joueur actif
        UI.buttons.move.disabled = false;
        UI.buttons.fastAttack.disabled = false;
        UI.buttons.heavyAttack.disabled = false;
        UI.buttons.special.disabled = currentPlayer.specialCooldown > 0;
        UI.buttons.defend.disabled = false;
        UI.buttons.dodge.disabled = currentPlayer.type !== 'ninja';
        UI.buttons.endTurn.disabled = false;
    }

    // Démarrer le jeu
    init();
});