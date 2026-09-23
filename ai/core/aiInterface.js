"use strict";

class AIInterface {

    constructor(config = {}) {

        this.snake = config.snake;
        this.food = config.food;

        this.boardWidth =
            config.boardWidth ?? 20;

        this.boardHeight =
            config.boardHeight ?? 20;
    }


    /* =========================================================
       INITIALIZATION
    ========================================================= */

    initialize() {
        throw new Error(
            "AI must implement initialize()"
        );
    }


    /* =========================================================
       RESET
    ========================================================= */

    reset() {
        // Optional.
        //
        // An AI can override this when it
        // maintains internal state.
    }


    /* =========================================================
       DECISION
    ========================================================= */

    getNextDirection() {
        throw new Error(
            "AI must implement getNextDirection()"
        );
    }


    /* =========================================================
       PATH
    ========================================================= */

    getPath() {
        return [];
    }


    /* =========================================================
       DECISION INFORMATION
    ========================================================= */

    getDecisionInfo() {
        return {
            strategy: "unknown",
            reason: "unknown"
        };
    }
}