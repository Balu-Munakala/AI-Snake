"use strict";

class GameManager {
    constructor(options = {}) {
        this.game = options.game || null;

        this.restartDelay = Number.isFinite(options.restartDelay)
            ? options.restartDelay
            : 1000;

        this.autoRestart = options.autoRestart !== false;

        this.stats = {
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,

            currentScore: 0,
            bestScore: 0,

            currentSnakeLength: 0,
            bestSnakeLength: 0,

            currentFoodEaten: 0,
            totalFoodEaten: 0,

            currentGameTime: 0,
            totalPlayTime: 0,
            bestGameTime: 0,

            startedAt: null
        };

        this.currentGameNumber = 0;
        this.restartTimeoutId = null;
        this.running = false;

        this.listeners = {
            gameStart: [],
            gameEnd: [],
            statsUpdate: []
        };
    }

    /*
     * ---------------------------------------------------------
     * INITIALIZATION
     * ---------------------------------------------------------
     */

    initialize(game) {
        if (game) {
            this.game = game;
        }

        this.validateGame();

        this.running = false;
        this.currentGameNumber = 0;

        this.resetStats();

        console.log("GameManager initialized.");
    }

    validateGame() {
        if (!this.game) {
            throw new Error(
                "GameManager requires a reference to the Snake game."
            );
        }

        if (!Array.isArray(this.game.snake)) {
            throw new Error(
                "GameManager expected game.snake to be an array."
            );
        }
    }

    /*
     * ---------------------------------------------------------
     * GAME LIFECYCLE
     * ---------------------------------------------------------
     */

    startGame() {
        this.clearRestartTimer();

        this.currentGameNumber += 1;

        this.stats.gamesPlayed += 1;

        this.stats.currentScore = 0;
        this.stats.currentSnakeLength = this.getSnakeLength();
        this.stats.currentGameTime = 0;

        this.stats.startedAt = performance.now();

        this.running = true;

        this.emit("gameStart", this.getSnapshot());

        this.emitStats();

        console.log(
            `Game #${this.currentGameNumber} started.`
        );
    }

    endGame(won = false) {
        if (!this.running) {
            return;
        }

        this.updateCurrentGameStats();

        this.stats.totalFoodEaten +=
            this.stats.currentFoodEaten;

        this.running = false;

        if (won) {
            this.stats.gamesWon += 1;
        } else {
            this.stats.gamesLost += 1;
        }

        this.updateBestStats();

        this.emit("gameEnd", {
            won,
            gameNumber: this.currentGameNumber,
            stats: this.getSnapshot()
        });

        this.emitStats();

        console.log(
            `Game #${this.currentGameNumber} ${won ? "WON" : "LOST"
            }.`
        );

        if (this.autoRestart) {
            this.scheduleRestart();
        }
    }

    scheduleRestart() {
        this.clearRestartTimer();

        this.restartTimeoutId = setTimeout(() => {
            this.restartTimeoutId = null;

            if (!this.game) {
                return;
            }

            this.restartGame();
        }, this.restartDelay);
    }

    restartGame() {
        if (!this.game) {
            return;
        }

        /*
         * The actual Snake game is responsible for resetting
         * its own snake, food, direction, score, etc.
         */
        if (typeof this.game.reset === "function") {
            this.game.reset();
        }

        this.startGame();

        if (typeof this.game.start === "function") {
            this.game.start();
        }
    }

    stop() {
        this.clearRestartTimer();

        this.running = false;

        if (this.stats.startedAt !== null) {
            this.updateCurrentGameStats();
        }

        console.log("GameManager stopped.");
    }

    /*
     * ---------------------------------------------------------
     * STATISTICS
     * ---------------------------------------------------------
     */

    update() {
        if (!this.running) {
            return;
        }

        this.updateCurrentGameStats();

        this.emitStats();
    }

    updateCurrentGameStats() {
        this.stats.currentScore = this.getScore();

        this.stats.currentFoodEaten =
            this.getScore();

        this.stats.currentSnakeLength =
            this.getSnakeLength();

        this.stats.currentGameTime =
            this.getCurrentGameTime();

        this.stats.totalPlayTime =
            this.getTotalPlayTime();
    }

    updateBestStats() {
        if (
            this.stats.currentScore >
            this.stats.bestScore
        ) {
            this.stats.bestScore =
                this.stats.currentScore;
        }

        if (
            this.stats.currentSnakeLength >
            this.stats.bestSnakeLength
        ) {
            this.stats.bestSnakeLength =
                this.stats.currentSnakeLength;
        }

        if (
            this.stats.currentGameTime >
            this.stats.bestGameTime
        ) {
            this.stats.bestGameTime =
                this.stats.currentGameTime;
        }
    }

    resetStats() {
        this.stats = {
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,

            currentScore: 0,
            bestScore: 0,

            currentSnakeLength: 0,
            bestSnakeLength: 0,

            currentFoodEaten: 0,
            totalFoodEaten: 0,

            currentGameTime: 0,
            totalPlayTime: 0,
            bestGameTime: 0,

            startedAt: null
        };
    }

    /*
     * ---------------------------------------------------------
     * GAME DATA
     * ---------------------------------------------------------
     */

    getScore() {
        if (
            this.game &&
            Number.isFinite(this.game.score)
        ) {
            return this.game.score;
        }

        return 0;
    }

    getSnakeLength() {
        if (
            this.game &&
            Array.isArray(this.game.snake)
        ) {
            return this.game.snake.length;
        }

        return 0;
    }

    getCurrentGameTime() {
        if (this.stats.startedAt === null) {
            return 0;
        }

        return performance.now() - this.stats.startedAt;
    }

    getTotalPlayTime() {
        let total = this.stats.totalPlayTime;

        if (this.running && this.stats.startedAt !== null) {
            total +=
                performance.now() -
                this.stats.startedAt;
        }

        return total;
    }

    /*
     * ---------------------------------------------------------
     * GAME NUMBER
     * ---------------------------------------------------------
     */

    getGameNumber() {
        return this.currentGameNumber;
    }

    /*
     * ---------------------------------------------------------
     * WIN RATE
     * ---------------------------------------------------------
     */

    getWinRate() {
        if (this.stats.gamesPlayed === 0) {
            return 0;
        }

        return (
            this.stats.gamesWon /
            this.stats.gamesPlayed
        ) * 100;
    }

    /*
     * ---------------------------------------------------------
     * SNAPSHOT
     * ---------------------------------------------------------
     */

    getSnapshot() {
        return {
            gameNumber: this.currentGameNumber,

            running: this.running,

            gamesPlayed:
                this.stats.gamesPlayed,

            gamesWon:
                this.stats.gamesWon,

            gamesLost:
                this.stats.gamesLost,

            winRate:
                this.getWinRate(),

            currentScore:
                this.stats.currentScore,

            bestScore:
                this.stats.bestScore,

            currentSnakeLength:
                this.stats.currentSnakeLength,

            bestSnakeLength:
                this.stats.bestSnakeLength,

            currentFoodEaten:
                this.stats.currentFoodEaten,

            totalFoodEaten:
                this.stats.totalFoodEaten,

            currentGameTime:
                this.stats.currentGameTime,

            totalPlayTime:
                this.getTotalPlayTime(),

            bestGameTime:
                this.stats.bestGameTime
        };
    }

    /*
     * ---------------------------------------------------------
     * EVENTS
     * ---------------------------------------------------------
     */

    on(eventName, callback) {
        if (!this.listeners[eventName]) {
            throw new Error(
                `Unknown GameManager event: ${eventName}`
            );
        }

        if (typeof callback !== "function") {
            throw new Error(
                "GameManager event listener must be a function."
            );
        }

        this.listeners[eventName].push(callback);

        return () => {
            this.off(eventName, callback);
        };
    }

    off(eventName, callback) {
        if (!this.listeners[eventName]) {
            return;
        }

        this.listeners[eventName] =
            this.listeners[eventName].filter(
                listener => listener !== callback
            );
    }

    emit(eventName, data) {
        const listeners =
            this.listeners[eventName];

        if (!listeners) {
            return;
        }

        for (const listener of listeners) {
            try {
                listener(data);
            } catch (error) {
                console.error(
                    `GameManager listener error (${eventName}):`,
                    error
                );
            }
        }
    }

    emitStats() {
        this.emit(
            "statsUpdate",
            this.getSnapshot()
        );
    }

    /*
     * ---------------------------------------------------------
     * TIMER
     * ---------------------------------------------------------
     */

    clearRestartTimer() {
        if (this.restartTimeoutId !== null) {
            clearTimeout(this.restartTimeoutId);

            this.restartTimeoutId = null;
        }
    }

    /*
     * ---------------------------------------------------------
     * CONFIGURATION
     * ---------------------------------------------------------
     */

    setAutoRestart(enabled) {
        this.autoRestart = Boolean(enabled);

        if (!this.autoRestart) {
            this.clearRestartTimer();
        }
    }

    isAutoRestartEnabled() {
        return this.autoRestart;
    }

    /*
     * ---------------------------------------------------------
     * RESET EVERYTHING
     * ---------------------------------------------------------
     */

    reset() {
        this.clearRestartTimer();

        this.running = false;

        this.currentGameNumber = 0;

        this.resetStats();

        this.emitStats();

        console.log(
            "GameManager statistics reset."
        );
    }
}