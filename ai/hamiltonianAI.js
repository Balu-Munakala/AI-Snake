"use strict";

/**
 * Hamiltonian Cycle AI for Snake
 *
 * The AI generates a Hamiltonian cycle over the entire
 * 20x20 board and follows it continuously.
 *
 * Since every board cell belongs to the cycle exactly once,
 * the snake can traverse the entire board without hitting
 * a wall or itself, eventually filling the board.
 *
 * The current implementation requires an EVEN board height
 * and works with the 20x20 board used by the game.
 */

class HamiltonianAI {
    constructor(game) {
        if (!game) {
            throw new Error("HamiltonianAI requires a game instance.");
        }

        this.game = game;

        this.width = 0;
        this.height = 0;

        this.cycle = [];
        this.positionToIndex = new Map();

        this.initialized = false;
    }

    /**
     * Initialize the Hamiltonian cycle.
     */
    initialize() {
        this.width = this.getBoardWidth();
        this.height = this.getBoardHeight();

        this.validateBoard();

        this.cycle = [];
        this.positionToIndex.clear();

        /*
        * Build a valid Hamiltonian cycle.
        *
        * Example conceptually:
        *
        *  → → → → → → → ↓
        *  ↑             ↓
        *  ↑ → → → → → → ↓
        *  ↑ ← ← ← ← ← ← ↓
        *  ↑ → → → → → → ↓
        *  ↑             ↓
        *  ← ← ← ← ← ← ← ←
        *
        * The first column is reserved as the final
        * return path to (0,0).
        */

        /*
        * 1. Traverse the top row from left to right.
        *
        * (0,0) → (1,0) → ... → (width-1,0)
        */
        for (let x = 0; x < this.width; x += 1) {
            this.cycle.push({
                x,
                y: 0
            });
        }

        /*
        * 2. Traverse the last column from top to bottom.
        *
        * (width-1,1) → ... → (width-1,height-1)
        */
        for (let y = 1; y < this.height; y += 1) {
            this.cycle.push({
                x: this.width - 1,
                y
            });
        }

        /*
        * 3. Traverse the remaining columns.
        *
        * We move from right to left.
        *
        * Alternate vertical direction so that every
        * transition remains between adjacent cells.
        */
        let currentY = this.height - 1;

        for (
            let x = this.width - 2;
            x >= 1;
            x -= 1
        ) {
            /*
            * Move horizontally into this column.
            */
            this.cycle.push({
                x,
                y: currentY
            });

            if (currentY === this.height - 1) {
                /*
                * Bottom → Top
                */
                for (
                    let y = this.height - 2;
                    y >= 1;
                    y -= 1
                ) {
                    this.cycle.push({
                        x,
                        y
                    });
                }

                currentY = 1;
            } else {
                /*
                * Top → Bottom
                */
                for (
                    let y = 2;
                    y < this.height;
                    y += 1
                ) {
                    this.cycle.push({
                        x,
                        y
                    });
                }

                currentY =
                    this.height - 1;
            }
        }

        /*
        * 4. Return through the first column.
        *
        * Current position is (1, height-1).
        *
        * Move:
        *
        * (1,height-1)
        *       ↓
        * (0,height-1)
        *       ↑
        * (0,height-2)
        *       ↑
        * ...
        *       ↑
        * (0,1)
        *
        * Then the cycle closes back to (0,0).
        */

        this.cycle.push({
            x: 0,
            y: this.height - 1
        });

        for (
            let y = this.height - 2;
            y >= 1;
            y -= 1
        ) {
            this.cycle.push({
                x: 0,
                y
            });
        }

        /*
        * Build lookup table.
        */
        for (
            let index = 0;
            index < this.cycle.length;
            index += 1
        ) {
            const cell = this.cycle[index];

            this.positionToIndex.set(
                positionKey(
                    cell.x,
                    cell.y
                ),
                index
            );
        }

        /*
        * Verify everything before allowing the AI
        * to control the game.
        */
        this.validateCycle();

        this.initialized = true;

        console.log(
            `Hamiltonian AI initialized: ${this.cycle.length} cells`
        );
    }

    /**
     * Return the next direction the snake should take.
     */
    getNextDirection() {
        if (!this.initialized) {
            this.initialize();
        }

        const head = this.getSnakeHead();

        if (!head) {
            console.error(
                "HamiltonianAI: Could not determine snake head."
            );

            return null;
        }

        const currentIndex = this.positionToIndex.get(
            positionKey(head.x, head.y)
        );

        if (currentIndex === undefined) {
            console.error(
                "HamiltonianAI: Snake head is not part of the Hamiltonian cycle.",
                head
            );

            return null;
        }

        /*
         * Move to the next cell.
         *
         * % makes the cycle wrap around.
         */
        const nextIndex =
            (currentIndex + 1) % this.cycle.length;

        const nextCell = this.cycle[nextIndex];

        return getDirection(head, nextCell);
    }

    /**
     * Get the snake head.
     */
    getSnakeHead() {
        if (!this.game.snake) {
            return null;
        }

        if (
            Array.isArray(this.game.snake) &&
            this.game.snake.length > 0
        ) {
            return {
                x: this.game.snake[0].x,
                y: this.game.snake[0].y
            };
        }

        return null;
    }

    /**
     * Convert two adjacent cells into a direction.
     */
    // getDirection(from, to) {
    //     const dx = to.x - from.x;
    //     const dy = to.y - from.y;

    //     if (dx === 1 && dy === 0) {
    //         return "RIGHT";
    //     }

    //     if (dx === -1 && dy === 0) {
    //         return "LEFT";
    //     }

    //     if (dx === 0 && dy === 1) {
    //         return "DOWN";
    //     }

    //     if (dx === 0 && dy === -1) {
    //         return "UP";
    //     }

    //     console.error(
    //         "HamiltonianAI: Invalid transition.",
    //         {
    //             from,
    //             to
    //         }
    //     );

    //     return null;
    // }

    /**
     * Get board width.
     */
    getBoardWidth() {
        if (Number.isInteger(this.game.boardWidth)) {
            return this.game.boardWidth;
        }

        /*
         * Your current game uses GRID_SIZE = 20.
         */
        return 20;
    }

    /**
     * Get board height.
     */
    getBoardHeight() {
        if (Number.isInteger(this.game.boardHeight)) {
            return this.game.boardHeight;
        }

        return 20;
    }

    /**
     * Create a unique key for a cell.
     */
    // positionKey(x, y) {
    //     return `${x},${y}`;
    // }

    /**
     * Validate board dimensions.
     */
    validateBoard() {
        if (!Number.isInteger(this.width) || this.width <= 0) {
            throw new Error(
                `Invalid board width: ${this.width}`
            );
        }

        if (!Number.isInteger(this.height) || this.height <= 0) {
            throw new Error(
                `Invalid board height: ${this.height}`
            );
        }

        /*
         * The construction below requires both dimensions
         * to be even.
         *
         * Your board is 20 x 20, so this is valid.
         */
        if (this.width % 2 !== 0) {
            throw new Error(
                "Hamiltonian AI requires an even board width."
            );
        }

        if (this.height % 2 !== 0) {
            throw new Error(
                "Hamiltonian AI requires an even board height."
            );
        }
    }

    /**
     * Validate the complete Hamiltonian cycle.
     *
     * This prevents the AI from running with a broken
     * cycle due to a programming error.
     */
    validateCycle() {
        const expectedCells =
            this.width * this.height;

        /*
         * Check number of cells.
         */
        if (this.cycle.length !== expectedCells) {
            throw new Error(
                `Invalid Hamiltonian cycle size. ` +
                `Expected ${expectedCells}, ` +
                `got ${this.cycle.length}.`
            );
        }

        /*
         * Check duplicate cells.
         */
        const visited = new Set();

        for (const cell of this.cycle) {
            const key = positionKey(
                cell.x,
                cell.y
            );

            if (visited.has(key)) {
                throw new Error(
                    `Hamiltonian cycle contains duplicate cell: ${key}`
                );
            }

            visited.add(key);
        }

        /*
         * Check that every board cell exists.
         */
        for (let y = 0; y < this.height; y += 1) {
            for (let x = 0; x < this.width; x += 1) {
                const key = positionKey(x, y);

                if (!visited.has(key)) {
                    throw new Error(
                        `Hamiltonian cycle is missing cell: ${key}`
                    );
                }
            }
        }

        /*
         * Check that every pair of consecutive cells
         * is physically adjacent.
         */
        for (let i = 0; i < this.cycle.length; i += 1) {
            const current = this.cycle[i];

            const next =
                this.cycle[
                    (i + 1) % this.cycle.length
                ];

            const distance =
                Math.abs(next.x - current.x) +
                Math.abs(next.y - current.y);

            if (distance !== 1) {
                throw new Error(
                    "Invalid Hamiltonian transition: " +
                    `${current.x},${current.y} -> ` +
                    `${next.x},${next.y}`
                );
            }
        }
    }

    /**
     * Return the cycle for debugging/visualization.
     */
    getCycle() {
        return [...this.cycle];
    }

    /**
     * Reset AI state.
     */
    reset() {
        this.cycle = [];
        this.positionToIndex.clear();
        this.initialized = false;
    }
}