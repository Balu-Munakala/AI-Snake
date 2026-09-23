"use strict";

(() => {
    /* =========================================================
       CONFIG
    ========================================================= */

    const GRID_SIZE = 20;
    const TICK_MS = 105;
    const STORAGE_KEY = "minimal-snake-high-score-v1";


    /* =========================================================
       GAME CONSTANTS
    ========================================================= */

    const STATE = Object.freeze({
        READY: "READY",
        RUNNING: "RUNNING",
        PAUSED: "PAUSED",
        GAME_OVER: "GAME_OVER"
    });

    const DIRECTIONS = Object.freeze({
        UP: { x: 0, y: -1 },
        DOWN: { x: 0, y: 1 },
        LEFT: { x: -1, y: 0 },
        RIGHT: { x: 1, y: 0 }
    });

    const KEY_TO_DIRECTION = Object.freeze({
        ArrowUp: "UP",
        ArrowDown: "DOWN",
        ArrowLeft: "LEFT",
        ArrowRight: "RIGHT",

        w: "UP",
        W: "UP",

        s: "DOWN",
        S: "DOWN",

        a: "LEFT",
        A: "LEFT",

        d: "RIGHT",
        D: "RIGHT"
    });


    /* =========================================================
       DOM
    ========================================================= */

    const $ = id => document.getElementById(id);

    const canvas = $("game-canvas");
    const ctx = canvas?.getContext("2d");

    const ui = {
        score: $("score"),
        highScore: $("high-score"),
        status: $("status"),
        message: $("game-message"),
        messageTitle: $("message-title"),
        messageDetail: $("message-detail"),
        start: $("start-button"),
        pause: $("pause-button"),
        pathButton: $("path-button"),

        // Start screen
        startPanel: $("start-panel"),
        startAiButton: $("start-ai-button"),
        viewStatsButton: $("view-stats-button"),
        startGames: $("start-games"),
        startBestScore: $("start-best-score"),
        startWinRate: $("start-win-rate"),

        // Game screen
        gameScreen: $("game-screen"),
        liveGameNumber: $("live-game-number"),
        liveScore: $("live-score"),
        liveLength: $("live-length"),
        liveTime: $("live-time"),

        aiStrategySelect: $("ai-strategy-select"),
        aiHead: $("ai-head"),
        aiFood: $("ai-food"),
        aiCurrentDirection: $("ai-current-direction"),
        aiNextDirection: $("ai-next-direction"),
        aiCyclePosition: $("ai-cycle-position"),

        backButton: $("back-button"),

        // Statistics screen
        statsScreen: $("stats-screen"),
        statsBackButton: $("stats-back-button"),
        statsGamesPlayed: $("stats-games-played"),
        statsGamesWon: $("stats-games-won"),
        statsGamesLost: $("stats-games-lost"),
        statsWinRate: $("stats-win-rate"),
        statsCurrentScore: $("stats-current-score"),
        statsBestScore: $("stats-best-score"),
        statsCurrentLength: $("stats-current-length"),
        statsBestLength: $("stats-best-length"),
        statsFoodEaten: $("stats-food-eaten"),
        statsCurrentTime: $("stats-current-time"),
        statsTotalTime: $("stats-total-time"),
        statsBestTime: $("stats-best-time")
    };

    if (
        !canvas ||
        !ctx ||
        Object.values(ui).some(element => !element)
    ) {
        console.error(
            "Snake game initialization failed: required DOM elements are missing."
        );
        return;
    }


    /* =========================================================
       GAME STATE
    ========================================================= */

    const game = {
        state: STATE.READY,

        snake: [],
        food: null,

        direction: "RIGHT",
        pendingDirection: "RIGHT",

        score: 0,
        highScore: loadHighScore(),

        loopId: null,
        lastTick: 0,

        boardSize: 0,
        cellSize: 0,

        aiEnabled: true,
        aiStrategy: "hamiltonian",
        ai: null,

        aiCycle: [],
        showAiPath: true,

        aiDecision: {
            nextDirection: null,
            cycleIndex: null
        },

        gameManager: null,

        environment: null,

        /*
         * GameManager uses these two methods.
         * They are assigned after the functions are declared.
         */
        reset: null,
        start: null
    };


    /* =========================================================
       STORAGE
    ========================================================= */

    function loadHighScore() {
        try {
            return Math.max(
                0,
                Number.parseInt(
                    localStorage.getItem(STORAGE_KEY),
                    10
                ) || 0
            );
        } catch {
            return 0;
        }
    }

    function saveHighScore() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                String(game.highScore)
            );
        } catch {
            // localStorage may be unavailable.
        }
    }


    /* =========================================================
       HELPERS
    ========================================================= */

    // function sameCell(a, b) {
    //     return a.x === b.x && a.y === b.y;
    // }

    // function isInsideBoard(cell) {
    //     return (
    //         cell.x >= 0 &&
    //         cell.x < GRID_SIZE &&
    //         cell.y >= 0 &&
    //         cell.y < GRID_SIZE
    //     );
    // }

    function isOpposite(a, b) {
        return (
            DIRECTIONS[a].x + DIRECTIONS[b].x === 0 &&
            DIRECTIONS[a].y + DIRECTIONS[b].y === 0
        );
    }

    // function isOccupied(cell) {
    //     return game.snake.some(segment =>
    //         sameCell(segment, cell)
    //     );
    // }


    /* =========================================================
       FOOD
    ========================================================= */

    // function createFood() {
    //     const freeCells = [];

    //     for (let y = 0; y < GRID_SIZE; y++) {
    //         for (let x = 0; x < GRID_SIZE; x++) {
    //             const cell = { x, y };

    //             if (!isOccupied(cell)) {
    //                 freeCells.push(cell);
    //             }
    //         }
    //     }

    //     if (freeCells.length === 0) {
    //         return null;
    //     }

    //     return freeCells[
    //         Math.floor(Math.random() * freeCells.length)
    //     ];
    // }


    /* =========================================================
       INPUT
    ========================================================= */

    function requestDirection(direction) {
        if (!DIRECTIONS[direction]) {
            return false;
        }

        if (
            game.state === STATE.RUNNING &&
            isOpposite(game.direction, direction)
        ) {
            return false;
        }

        game.pendingDirection = direction;

        /*
         * If AI is disabled, first manual input
         * can start a READY game.
         */
        if (
            game.state === STATE.READY &&
            !game.aiEnabled
        ) {
            startGame();
        }

        return true;
    }


    /* =========================================================
       RESET
    ========================================================= */

    function resetGame() {
        stopLoop();

        game.state = STATE.READY;
        game.score = 0;

        // game.snake = [
        //     { x: 10, y: 10 },
        //     { x: 9, y: 10 },
        //     { x: 8, y: 10 }
        // ];

        // game.direction = "RIGHT";
        // game.pendingDirection = "RIGHT";

        // game.aiDecision.nextDirection = null;
        // game.aiDecision.cycleIndex = null;

        // game.food = createFood();

        game.environment.reset();

        const state = game.environment.getState();

        game.snake = state.snake;
        game.food = state.food;
        game.direction = state.direction;
        game.pendingDirection = state.direction;
        game.score = state.score;

        game.aiDecision.nextDirection = null;
        game.aiDecision.cycleIndex = null;

        if (
            game.ai &&
            typeof game.ai.reset === "function"
        ) {
            game.ai.reset();
        }

        updateUI();
        render();
    }


    /* =========================================================
       START
    ========================================================= */

    function startGame() {
        if (game.state === STATE.GAME_OVER) {
            resetGame();
        }

        if (
            game.state !== STATE.READY &&
            game.state !== STATE.PAUSED
        ) {
            return;
        }

        game.state = STATE.RUNNING;
        game.lastTick = performance.now();

        startLoop();

        updateUI();
        render();
    }


    /* =========================================================
       MANAGED RESTART
    ========================================================= */

    function restartGame() {
        /*
         * GameManager is the owner of restarts.
         */
        if (game.gameManager) {
            game.gameManager.restartGame();
            return;
        }

        /*
         * Fallback for debugging if GameManager
         * has not been initialized.
         */
        resetGame();
        startGame();
    }


    /* =========================================================
       PAUSE
    ========================================================= */

    function togglePause() {
        if (game.state === STATE.RUNNING) {
            game.state = STATE.PAUSED;

            stopLoop();

            updateUI();
            render();

            return;
        }

        if (game.state === STATE.PAUSED) {
            startGame();
        }
    }


    /* =========================================================
       GAME LOOP
    ========================================================= */

    function startLoop() {
        /*
         * Guarantee that there is only one RAF loop.
         */
        stopLoop();

        game.loopId = requestAnimationFrame(loop);
    }

    function stopLoop() {
        if (game.loopId !== null) {
            cancelAnimationFrame(game.loopId);
            game.loopId = null;
        }
    }

    function loop(now) {
        if (game.state !== STATE.RUNNING) {
            game.loopId = null;
            return;
        }

        if (now - game.lastTick >= TICK_MS) {
            game.lastTick = now;
            update();
        }

        render();

        game.loopId = requestAnimationFrame(loop);
    }


    /* =========================================================
       AI
    ========================================================= */

    function createAIConfig() {

        return {

            get snake() {
                return game.snake;
            },

            get food() {
                return game.food;
            },

            boardWidth:
                GRID_SIZE,

            boardHeight:
                GRID_SIZE
        };
    }

    function updateAI() {
        if (!game.aiEnabled || !game.ai) {
            return;
        }

        try {
            const direction =
                game.ai.getNextDirection();

            if (direction) {
                game.aiDecision.nextDirection =
                    direction;

                requestDirection(direction);
            }

            if (
                game.aiStrategy ===
                "hamiltonian"
            ) {
                updateHamiltonianPosition();
            }

        } catch (error) {
            console.error(
                "AI error:",
                error
            );
        }
    }

    function updateHamiltonianPosition() {
        if (
            game.aiCycle.length === 0 ||
            game.snake.length === 0
        ) {
            game.aiDecision.cycleIndex =
                null;

            return;
        }

        const head =
            game.snake[0];

        const index =
            game.aiCycle.findIndex(
                cell =>
                    cell.x === head.x &&
                    cell.y === head.y
            );

        game.aiDecision.cycleIndex =
            index >= 0
                ? index
                : null;
    }


    /* =========================================================
       GAME UPDATE
    ========================================================= */

    // function update() {
    //     /*
    //      * Let AI choose the next direction.
    //      */
    //     updateAI();

    //     /*
    //      * Apply direction.
    //      */
    //     game.direction = game.pendingDirection;

    //     const vector = DIRECTIONS[game.direction];

    //     const nextHead = {
    //         x: game.snake[0].x + vector.x,
    //         y: game.snake[0].y + vector.y
    //     };

    //     /*
    //      * Determine whether food will be eaten.
    //      */
    //     const willEat =
    //         game.food &&
    //         sameCell(nextHead, game.food);

    //     /*
    //      * If not eating, the tail moves away.
    //      * Therefore the current tail is allowed.
    //      */
    //     const bodyToCheck = willEat
    //         ? game.snake
    //         : game.snake.slice(0, -1);

    //     /*
    //      * Collision detection.
    //      */
    //     const hitsWall = !isInsideBoard(nextHead, GRID_SIZE, GRID_SIZE);

    //     const hitsBody = bodyToCheck.some(segment =>
    //         sameCell(segment, nextHead)
    //     );

    //     if (hitsWall || hitsBody) {
    //         endGame(false);
    //         return;
    //     }

    //     /*
    //      * Add new head.
    //      */
    //     game.snake.unshift(nextHead);

    //     if (willEat) {
    //         /*
    //          * Food consumed.
    //          */
    //         game.score++;

    //         game.highScore = Math.max(
    //             game.highScore,
    //             game.score
    //         );

    //         saveHighScore();

    //         /*
    //          * Generate next food.
    //          */
    //         game.food = createFood();

    //         /*
    //          * No free cells = board completely filled.
    //          */
    //         if (!game.food) {
    //             endGame(true);
    //             return;
    //         }
    //     } else {
    //         /*
    //          * Normal movement.
    //          */
    //         game.snake.pop();
    //     }

    //     updateUI();

    //     /*
    //      * Update GameManager statistics.
    //      */
    //     if (game.gameManager) {
    //         game.gameManager.update();
    //     }
    // }

    function update() {

        /*
        * Let AI choose the next direction.
        */
        updateAI();

        /*
        * Let the environment execute the action.
        */
        const result =
            game.environment.step(
                game.pendingDirection
            );

        /*
        * Synchronize game controller state
        * with environment state.
        */
        const state = result.state;

        game.snake = state.snake;
        game.food = state.food;
        game.direction = state.direction;
        game.pendingDirection = state.direction;
        game.score = state.score;

        /*
        * Update high score.
        */
        if (game.score > game.highScore) {
            game.highScore = game.score;
            saveHighScore();
        }

        /*
        * Environment decides whether
        * the game has ended.
        */
        if (result.done) {
            endGame(result.won);
            return;
        }

        /*
        * Update UI.
        */
        updateUI();

        /*
        * Update GameManager statistics.
        */
        if (game.gameManager) {
            game.gameManager.update();
        }
    }


    /* =========================================================
       END GAME
    ========================================================= */

    function endGame(won) {
        if (game.state === STATE.GAME_OVER) {
            return;
        }

        game.state = STATE.GAME_OVER;

        stopLoop();

        updateUI(
            won ? "Board cleared!" : "Game over",
            won
                ? "The AI filled every cell."
                : "The AI collided with an obstacle."
        );

        render();

        /*
         * GameManager handles:
         * - statistics
         * - game number
         * - automatic restart
         */
        if (game.gameManager) {
            game.gameManager.endGame(won);
        }
    }


    /* =========================================================
       CANVAS
    ========================================================= */

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();

        const size = Math.max(
            1,
            Math.floor(rect.width)
        );

        const pixelRatio = Math.min(
            window.devicePixelRatio || 1,
            2
        );

        canvas.width = size * pixelRatio;
        canvas.height = size * pixelRatio;

        ctx.setTransform(
            pixelRatio,
            0,
            0,
            pixelRatio,
            0,
            0
        );

        game.boardSize = size;
        game.cellSize = size / GRID_SIZE;

        render();
    }


    /* =========================================================
       UI
    ========================================================= */

    function updateUI(title, detail) {
        ui.score.textContent = String(game.score);
        ui.highScore.textContent = String(game.highScore);

        ui.status.textContent = game.aiEnabled
            ? `AI • ${game.state.replace("_", " ")}`
            : game.state.replace("_", " ");

        const messages = {
            [STATE.READY]: [
                "AI Ready",
                "The Hamiltonian AI will play automatically."
            ],

            [STATE.PAUSED]: [
                "Paused",
                "Press Space or Resume to continue."
            ],

            [STATE.GAME_OVER]: [
                title || "Game over",
                detail || "Press Enter, R, or Restart to play again."
            ]
        };

        const message = messages[game.state];

        ui.message.classList.toggle(
            "is-hidden",
            !message
        );

        if (message) {
            ui.messageTitle.textContent = message[0];
            ui.messageDetail.textContent = message[1];
        }

        ui.start.textContent =
            game.state === STATE.READY
                ? "Start AI"
                : "Restart game";

        ui.pause.disabled =
            game.state !== STATE.RUNNING &&
            game.state !== STATE.PAUSED;

        ui.pause.textContent =
            game.state === STATE.PAUSED
                ? "Resume"
                : "Pause";
        updateStatsUI();
        updateAiDecisionUI();
    }

    function formatTime(milliseconds) {
        const totalSeconds = Math.max(
            0,
            Math.floor(milliseconds / 1000)
        );

        const hours = Math.floor(
            totalSeconds / 3600
        );

        const minutes = Math.floor(
            (totalSeconds % 3600) / 60
        );

        const seconds =
            totalSeconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        }

        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }

        return `${seconds}s`;
    }

    function updateStatsUI() {
        if (!game.gameManager) {
            return;
        }

        const stats =
            game.gameManager.getSnapshot();

        // -----------------------------
        // Start screen
        // -----------------------------

        ui.startGames.textContent =
            stats.gamesPlayed;

        ui.startBestScore.textContent =
            stats.bestScore;

        ui.startWinRate.textContent =
            `${stats.winRate.toFixed(1)}%`;


        // -----------------------------
        // Live game statistics
        // -----------------------------

        ui.liveGameNumber.textContent =
            stats.gameNumber;

        ui.liveScore.textContent =
            stats.currentScore;

        ui.liveLength.textContent =
            stats.currentSnakeLength;

        ui.liveTime.textContent =
            formatTime(
                stats.currentGameTime
            );


        // -----------------------------
        // Full statistics
        // -----------------------------

        ui.statsGamesPlayed.textContent =
            stats.gamesPlayed;

        ui.statsGamesWon.textContent =
            stats.gamesWon;

        ui.statsGamesLost.textContent =
            stats.gamesLost;

        ui.statsWinRate.textContent =
            `${stats.winRate.toFixed(1)}%`;

        ui.statsCurrentScore.textContent =
            stats.currentScore;

        ui.statsBestScore.textContent =
            stats.bestScore;

        ui.statsCurrentLength.textContent =
            stats.currentSnakeLength;

        ui.statsBestLength.textContent =
            stats.bestSnakeLength;

        ui.statsFoodEaten.textContent =
            stats.totalFoodEaten;

        ui.statsCurrentTime.textContent =
            formatTime(
                stats.currentGameTime
            );

        ui.statsTotalTime.textContent =
            formatTime(
                stats.totalPlayTime
            );

        ui.statsBestTime.textContent =
            formatTime(
                stats.bestGameTime
            );
    }

    function updateAiDecisionUI() {
        try {
            if (!game.snake.length) {
                return;
            }

            const head = game.snake[0];

            if (
                game.aiStrategy ===
                "hamiltonian" &&
                game.aiDecision.cycleIndex !== null
            ) {
                ui.aiCyclePosition.textContent =
                    `${game.aiDecision.cycleIndex + 1} / ${game.aiCycle.length}`;
            } else if (
                game.aiStrategy === "bfs" || game.aiStrategy === "safe-bfs"
            ) {
                ui.aiCyclePosition.textContent =
                    `${game.ai.getPath().length} cells`;
            } else {
                ui.aiCyclePosition.textContent =
                    "--";
            }

            ui.aiHead.textContent = `(${head.x}, ${head.y})`;

            ui.aiFood.textContent =
                game.food
                    ? `(${game.food.x}, ${game.food.y})`
                    : "None";

            ui.aiCurrentDirection.textContent = game.direction;

            ui.aiNextDirection.textContent = game.aiDecision.nextDirection || "--";

        } catch (err) {
            console.error("Error in updateAiDecisionUI:", err);
        }
    }

    function showStartScreen() {
        ui.startPanel.classList.remove(
            "is-hidden"
        );

        ui.gameScreen.classList.add(
            "is-hidden"
        );

        ui.statsScreen.classList.add(
            "is-hidden"
        );

        updateStatsUI();
    }


    function showGameScreen() {
        ui.startPanel.classList.add(
            "is-hidden"
        );

        ui.gameScreen.classList.remove(
            "is-hidden"
        );

        ui.statsScreen.classList.add(
            "is-hidden"
        );

        updateStatsUI();
        resizeCanvas();
    }


    function showStatsScreen() {
        ui.startPanel.classList.add(
            "is-hidden"
        );

        ui.gameScreen.classList.add(
            "is-hidden"
        );

        ui.statsScreen.classList.remove(
            "is-hidden"
        );

        updateStatsUI();
    }


    /* =========================================================
       RENDER
    ========================================================= */

    // const AI_RENDERERS = {
    //     hamiltonian: drawHamiltonianPath,
    //     bfs: drawBfsPath,
    //     "safe-bfs": drawSafeBfsPath
    // };

    function render() {
        const size = game.boardSize;

        if (!size) {
            return;
        }

        /*
         * Background.
         */
        ctx.clearRect(0, 0, size, size);

        ctx.fillStyle = "#12191d";
        ctx.fillRect(0, 0, size, size);

        /*
         * Grid.
         */
        ctx.strokeStyle = "#1c292d";
        ctx.lineWidth = 1;

        for (let i = 1; i < GRID_SIZE; i++) {
            const p =
                Math.round(i * game.cellSize) + 0.5;

            ctx.beginPath();

            ctx.moveTo(p, 0);
            ctx.lineTo(p, size);

            ctx.moveTo(0, p);
            ctx.lineTo(size, p);

            ctx.stroke();
        }

        /*
        * Hamiltonian AI path.
        */
        if (game.showAiPath) {
            const renderer =
                AI_PATH_RENDERERS[game.aiStrategy];

            if (renderer) {
                renderer();
            }
        }

        /*
         * Food.
         */
        if (game.food) {
            ctx.fillStyle = "#ff785a";
            drawCell(game.food, 0.18);
        }

        /*
         * Snake.
         */
        game.snake.forEach((segment, index) => {
            ctx.fillStyle =
                index === 0
                    ? "#d5ff91"
                    : "#b9f267";

            drawCell(segment, 0.1);
        });
    }

    function drawHamiltonianPath() {
        ctx.save();

        ctx.strokeStyle = "rgba(155, 214, 255, 0.35)";
        ctx.lineWidth = 1.5;

        ctx.beginPath();

        game.aiCycle.forEach((cell, index) => {
            const centerX =
                cell.x * game.cellSize +
                game.cellSize / 2;

            const centerY =
                cell.y * game.cellSize +
                game.cellSize / 2;

            if (index === 0) {
                ctx.moveTo(
                    centerX,
                    centerY
                );
            } else {
                ctx.lineTo(
                    centerX,
                    centerY
                );
            }
        });

        /*
        * Close the Hamiltonian cycle.
        */
        const first = game.aiCycle[0];

        ctx.lineTo(
            first.x * game.cellSize +
            game.cellSize / 2,

            first.y * game.cellSize +
            game.cellSize / 2
        );

        ctx.stroke();

        ctx.restore();
    }

    // function drawBfsPath() {
    //     const path = game.ai.getPath();

    //     if (!path || path.length < 2) {
    //         return;
    //     }

    //     ctx.save();

    //     ctx.strokeStyle = "rgba(255, 214, 102, 0.8)";
    //     ctx.lineWidth = 2.5;

    //     ctx.beginPath();

    //     path.forEach((cell, index) => {
    //         const centerX =
    //             cell.x * game.cellSize +
    //             game.cellSize / 2;

    //         const centerY =
    //             cell.y * game.cellSize +
    //             game.cellSize / 2;

    //         if (index === 0) {
    //             ctx.moveTo(
    //                 centerX,
    //                 centerY
    //             );
    //         } else {
    //             ctx.lineTo(
    //                 centerX,
    //                 centerY
    //             );
    //         }
    //     });

    //     ctx.stroke();

    //     ctx.restore();
    // }

    // function drawSafeBfsPath() {

    //     const path =
    //         game.ai.getPath();

    //     if (
    //         !path ||
    //         path.length < 2
    //     ) {
    //         return;
    //     }

    //     ctx.save();

    //     /*
    //     * Safe BFS path.
    //     */
    //     ctx.strokeStyle =
    //         "rgba(126, 255, 180, 0.9)";

    //     ctx.lineWidth = 3;

    //     ctx.beginPath();


    //     path.forEach(
    //         (cell, index) => {

    //             const centerX =
    //                 cell.x *
    //                     game.cellSize +
    //                 game.cellSize / 2;

    //             const centerY =
    //                 cell.y *
    //                     game.cellSize +
    //                 game.cellSize / 2;


    //             if (index === 0) {

    //                 ctx.moveTo(
    //                     centerX,
    //                     centerY
    //                 );

    //             } else {

    //                 ctx.lineTo(
    //                     centerX,
    //                     centerY
    //                 );
    //             }
    //         }
    //     );


    //     ctx.stroke();
    
    //     ctx.restore();
    // }

    const AI_PATH_RENDERERS = {
        hamiltonian: () => {
            drawHamiltonianPath();
        },

        bfs: () => {
            drawAiPath(
                game.ai.getPath(),
                {
                    strokeStyle: "rgba(255, 214, 102, 0.8)",
                    lineWidth: 2.5
                }
            );
        },

        "safe-bfs": () => {
            drawAiPath(
                game.ai.getPath(),
                {
                    strokeStyle: "rgba(126, 255, 180, 0.9)",
                    lineWidth: 3
                }
            );
        }
    };
    
    function drawAiPath(path, style) {
        if (!path || path.length < 2) {
            return;
        }

        ctx.save();

        ctx.strokeStyle = style.strokeStyle;
        ctx.lineWidth = style.lineWidth;

        ctx.beginPath();

        path.forEach((cell, index) => {
            const centerX =
                cell.x * game.cellSize +
                game.cellSize / 2;

            const centerY =
                cell.y * game.cellSize +
                game.cellSize / 2;

            if (index === 0) {
                ctx.moveTo(centerX, centerY);
            } else {
                ctx.lineTo(centerX, centerY);
            }
        });

        ctx.stroke();

        ctx.restore();
    }


    function drawCell(cell, insetFactor) {
        const inset =
            game.cellSize * insetFactor;

        const size =
            game.cellSize - inset * 2;

        ctx.fillRect(
            cell.x * game.cellSize + inset,
            cell.y * game.cellSize + inset,
            size,
            size
        );
    }


    /* =========================================================
       KEYBOARD
    ========================================================= */

    function onKeyDown(event) {
        const key = event.key;

        /*
         * Browser refresh shortcut.
         */
        if (
            (event.ctrlKey || event.metaKey) &&
            key.toLowerCase() === "r"
        ) {
            /*
             * Do not interfere with browser refresh.
             */
            return;
        }

        /*
         * Direction.
         */
        const direction =
            KEY_TO_DIRECTION[key];

        if (direction) {
            event.preventDefault();

            if (!game.aiEnabled) {
                requestDirection(direction);
            }

            return;
        }

        /*
         * Pause.
         */
        if (event.code === "Space") {
            event.preventDefault();
            togglePause();
            return;
        }

        /*
         * Restart.
         */
        if (
            key === "Enter" ||
            key.toLowerCase() === "r"
        ) {
            event.preventDefault();
            restartGame();
        }
    }


    /* =========================================================
       TOUCH
    ========================================================= */

    let touchStart = null;

    function onTouchStart(event) {
        const touch = event.changedTouches[0];

        if (!touch) {
            return;
        }

        touchStart = {
            x: touch.clientX,
            y: touch.clientY
        };
    }

    function onTouchMove(event) {
        event.preventDefault();
    }

    function onTouchEnd(event) {
        if (!touchStart || game.aiEnabled) {
            touchStart = null;
            return;
        }

        const touch = event.changedTouches[0];

        if (!touch) {
            touchStart = null;
            return;
        }

        const dx =
            touch.clientX - touchStart.x;

        const dy =
            touch.clientY - touchStart.y;

        touchStart = null;

        if (
            Math.max(
                Math.abs(dx),
                Math.abs(dy)
            ) < 24
        ) {
            return;
        }

        const direction =
            Math.abs(dx) > Math.abs(dy)
                ? dx > 0
                    ? "RIGHT"
                    : "LEFT"
                : dy > 0
                    ? "DOWN"
                    : "UP";

        requestDirection(direction);
    }


    /* =========================================================
       PUBLIC API
    ========================================================= */

    /*
     * These are intentionally simple.
     * GameManager can use them without knowing
     * anything about Snake internals.
     */
    game.reset = resetGame;
    game.start = startGame;

    window.snakeGame = Object.freeze({
        setDirection: requestDirection,

        reset: resetGame,

        start: startGame,

        pause: togglePause,

        restart: restartGame,

        getState: () => game.state,

        getGameState: () => ({
            state: game.state,

            snake: game.snake.map(segment => ({
                x: segment.x,
                y: segment.y
            })),

            food: game.food
                ? {
                    x: game.food.x,
                    y: game.food.y
                }
                : null,

            direction: game.direction,

            pendingDirection:
                game.pendingDirection,

            score: game.score,

            highScore:
                game.highScore
        }),
        getStats: () => {
            if (!game.gameManager) {
                return null;
            }

            return game.gameManager.getSnapshot();
        }
    });


    /* =========================================================
       EVENTS
    ========================================================= */

    window.addEventListener(
        "keydown",
        onKeyDown,
        {
            passive: false,
            capture: true
        }
    );

    canvas.addEventListener(
        "touchstart",
        onTouchStart,
        {
            passive: true
        }
    );

    canvas.addEventListener(
        "touchmove",
        onTouchMove,
        {
            passive: false
        }
    );

    canvas.addEventListener(
        "touchend",
        onTouchEnd,
        {
            passive: true
        }
    );

    function beginNewGame() {
        if (
            game.state === STATE.RUNNING ||
            game.state === STATE.PAUSED
        ) {
            return;
        }

        resetGame();
        startGame();

        if (game.gameManager) {
            game.gameManager.startGame();
        }

        canvas.focus();
    }

    ui.start.addEventListener(
        "click",
        () => {
            if (game.state === STATE.READY) {
                beginNewGame();
            } else {
                restartGame();
            }
        }
    );

    ui.startAiButton.addEventListener(
        "click",
        beginNewGame
    );

    ui.viewStatsButton.addEventListener(
        "click",
        () => {
            showStatsScreen();
        }
    );

    ui.statsBackButton.addEventListener(
        "click",
        () => {
            showStartScreen();
        }
    );

    ui.pause.addEventListener(
        "click",
        () => {
            togglePause();
            canvas.focus();
        }
    );

    ui.pathButton.addEventListener(
        "click",
        () => {
            game.showAiPath =
                !game.showAiPath;

            ui.pathButton.textContent =
                game.showAiPath
                    ? "Hide AI Path"
                    : "Show AI Path";

            render();

            canvas.focus();
        }
    );

    ui.backButton.addEventListener(
        "click",
        () => {
            resetGame();

            if (game.gameManager) {
                game.gameManager.clearRestartTimer();
            }

            showStartScreen();
        }
    );

    ui.aiStrategySelect.addEventListener(
        "change",
        () => {
            const strategy =
                ui.aiStrategySelect.value;

            // if (
            //     game.state === STATE.RUNNING ||
            //     game.state === STATE.PAUSED
            // ) {
            //     ui.aiStrategySelect.value =
            //         game.aiStrategy;
                
            //     return;
            // }

            ui.aiStrategySelect.value =
                    game.aiStrategy;

            game.aiStrategy =
                strategy;

            game.ai =
                AIRegistry.create(
                    strategy,
                    createAIConfig()
                );

            game.ai.initialize();

            if (
                game.aiStrategy ===
                "hamiltonian"
            ) {
                game.aiCycle =
                    game.ai.getCycle();
            } else {
                game.aiCycle = [];
            }

            /*
            * Clear previous AI decision.
            */
            game.aiDecision.nextDirection =
                null;

            game.aiDecision.cycleIndex =
                null;

            /*
            * Reset the board using
            * the newly selected AI.
            */
            resetGame();

            /*
            * Make sure the dropdown reflects
            * the actual active strategy.
            */
            ui.aiStrategySelect.value =
                game.aiStrategy;

            updateUI();
            render();
        }
    );

    window.addEventListener(
        "resize",
        resizeCanvas,
        {
            passive: true
        }
    );

    window.addEventListener(
        "beforeunload",
        () => {
            stopLoop();
        }
    );


    /* =========================================================
       INITIALIZATION
    ========================================================= */

    function initialize() {
        /*
         * HamiltonianAI must already be loaded.
         */
        if (typeof HamiltonianAI !== "function") {
            throw new Error(
                "HamiltonianAI is not loaded. Check index.html."
            );
        }

        game.environment = new SnakeEnvironment({
            width: GRID_SIZE,
            height: GRID_SIZE
        });

        /*
         * Create AI.
         */
        game.ai = AIRegistry.create(
                    game.aiStrategy,
                    createAIConfig()
                );

        game.ai.initialize();

        if (
            game.aiStrategy === "hamiltonian"
        ) {
            game.aiCycle =
                game.ai.getCycle();
        }


        /*
         * GameManager must already be loaded.
         */
        if (typeof GameManager !== "function") {
            throw new Error(
                "GameManager is not loaded. Check index.html."
            );
        }

        /*
         * IMPORTANT:
         *
         * We pass the internal game object because
         * GameManager needs:
         *
         * game.reset()
         * game.start()
         * game.score
         * game.snake
         */
        game.gameManager = new GameManager({
            game: game,
            restartDelay: 1000,
            autoRestart: true
        });

        game.gameManager.initialize(game);

        game.gameManager.on(
            "gameStart",
            () => {
                showGameScreen();
                updateStatsUI();
            }
        );

        game.gameManager.on(
            "gameEnd",
            () => {
                updateStatsUI();
            }
        );

        game.gameManager.on(
            "statsUpdate",
            () => {
                updateStatsUI();
            }
        );

        /*
        * Create initial game.
        */
        resetGame();

        requestAnimationFrame(() => {
            resizeCanvas();
            render();
        });

        /*
        * Show start screen.
        */
        showStartScreen();
    }


    /* =========================================================
       BOOT
    ========================================================= */

    try {
        initialize();
    } catch (error) {
        console.error(
            "Snake game initialization failed:",
            error
        );

        game.state = STATE.GAME_OVER;

        ui.message.classList.remove("is-hidden");

        ui.messageTitle.textContent =
            "Initialization error";

        ui.messageDetail.textContent =
            "Check the browser console.";

        ui.start.disabled = true;
        ui.pause.disabled = true;
    }

})();