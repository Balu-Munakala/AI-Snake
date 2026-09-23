"use strict";

/**
 * Breadth-First Search AI for Snake.
 *
 * The AI searches the current board from
 * the snake head to the food.
 *
 * Snake body cells are treated as obstacles.
 *
 * BFS guarantees the shortest path in terms
 * of number of grid cells when all moves have
 * equal cost.
 */
class BFSAI {
    constructor(config) {
        if (!config) {
            throw new Error(
                "BFS AI requires a game instance."
            );
        }

        this.config = config;

        this.width = 0;
        this.height = 0;

        this.path = [];
        this.nextDirection = null;

        this.searchNodes = 0;

        this.initialized = false;
    }

    get snake() {
        return this.config.snake;
    }

    get food() {
        return this.config.food;
    }

    /**
     * Initialize the AI.
     */
    initialize() {
        this.width =
            this.getBoardWidth();

        this.height =
            this.getBoardHeight();

        this.validateBoard();

        this.path = [];
        this.nextDirection = null;
        this.searchNodes = 0;

        this.initialized = true;
    }

    /**
     * Find the next direction.
     *
     * A new BFS search is performed for
     * the current board state.
     */
    getNextDirection() {
        if (!this.initialized) {
            this.initialize();
        }

        this.path = [];
        this.nextDirection = null;
        this.searchNodes = 0;

        const head =
            this.getSnakeHead();

        const food =
            this.getFood();

        if (!head || !food) {
            return null;
        }

        /*
         * If head is already on food,
         * there is no movement to make.
         */
        if (sameCell(head, food)) {
            return null;
        }

        const path =
            this.findPath(head, food);

        if (!path || path.length < 2) {
            return null;
        }

        this.path = path;

        const nextCell =
            path[1];

        this.nextDirection =
            getDirection(
                head,
                nextCell
            );

        return this.nextDirection;
    }

    /**
     * Perform BFS.
     */
    findPath(start, target) {
        const queue = [];

        let queueIndex = 0;

        const visited =
            new Set();

        const parent =
            new Map();

        /*
         * Snake body is treated as
         * an obstacle.
         */
        const blocked =
            new Set();

        for (const segment of this.snake) {
            blocked.add(
                positionKey(
                    segment.x,
                    segment.y
                )
            );
        }

        /*
         * The starting cell must remain
         * searchable.
         */
        blocked.delete(
            positionKey(
                start.x,
                start.y
            )
        );

        const startKey =
            positionKey(
                start.x,
                start.y
            );

        const targetKey =
            positionKey(
                target.x,
                target.y
            );

        queue.push(start);

        visited.add(startKey);

        parent.set(
            startKey,
            null
        );

        while (
            queueIndex <
            queue.length
        ) {
            const current =
                queue[queueIndex];

            queueIndex += 1;

            this.searchNodes += 1;

            const currentKey =
                positionKey(
                    current.x,
                    current.y
                );

            /*
             * Target found.
             */
            if (
                currentKey ===
                targetKey
            ) {
                return this.reconstructPath(
                    parent,
                    startKey,
                    targetKey
                );
            }

            const neighbors =
                getNeighbors(
                    current
                );

            for (
                const neighbor
                of neighbors
            ) {
                if (
                    !isInsideBoard(
                        neighbor, this.width, this.height
                    )
                ) {
                    continue;
                }

                const neighborKey =
                    positionKey(
                        neighbor.x,
                        neighbor.y
                    );

                if (
                    visited.has(
                        neighborKey
                    )
                ) {
                    continue;
                }

                if (
                    blocked.has(
                        neighborKey
                    )
                ) {
                    continue;
                }

                visited.add(
                    neighborKey
                );

                parent.set(
                    neighborKey,
                    currentKey
                );

                queue.push(
                    neighbor
                );
            }
        }

        /*
         * No path exists.
         */
        return null;
    }

    /**
     * Reconstruct path using the
     * parent map.
     *
     * Result:
     *
     * [
     *   head,
     *   next,
     *   next,
     *   ...,
     *   food
     * ]
     */
    reconstructPath(
        parent,
        startKey,
        targetKey
    ) {
        const reversedPath = [];

        let currentKey =
            targetKey;

        while (
            currentKey !== null
        ) {
            const [x, y] =
                currentKey
                    .split(",")
                    .map(Number);

            reversedPath.push({
                x,
                y
            });

            currentKey =
                parent.get(
                    currentKey
                );
        }

        /*
         * BFS reconstructs from
         * target → start.
         *
         * Reverse it to:
         * start → target.
         */
        reversedPath.reverse();

        /*
         * Sanity check.
         */
        if (
            reversedPath.length === 0 ||
            !sameCell(
                reversedPath[0],
                this.getSnakeHead()
            )
        ) {
            return null;
        }

        return reversedPath;
    }

    /**
     * Return neighboring cells.
     */
    // getNeighbors(cell) {
    //     return [
    //         {
    //             x: cell.x + 1,
    //             y: cell.y
    //         },
    //         {
    //             x: cell.x - 1,
    //             y: cell.y
    //         },
    //         {
    //             x: cell.x,
    //             y: cell.y + 1
    //         },
    //         {
    //             x: cell.x,
    //             y: cell.y - 1
    //         }
    //     ];
    // }

    /**
     * Convert two adjacent cells
     * into a direction.
     */
    // getDirection(from, to) {
    //     const dx =
    //         to.x - from.x;

    //     const dy =
    //         to.y - from.y;

    //     if (
    //         dx === 1 &&
    //         dy === 0
    //     ) {
    //         return "RIGHT";
    //     }

    //     if (
    //         dx === -1 &&
    //         dy === 0
    //     ) {
    //         return "LEFT";
    //     }

    //     if (
    //         dx === 0 &&
    //         dy === 1
    //     ) {
    //         return "DOWN";
    //     }

    //     if (
    //         dx === 0 &&
    //         dy === -1
    //     ) {
    //         return "UP";
    //     }

    //     return null;
    // }

    /**
     * Get the snake head.
     */
    getSnakeHead() {
        if (
            !Array.isArray(this.snake) ||
            this.snake.length === 0
        ) {
            return null;
        }

        return {
            x: this.snake[0].x,
            y: this.snake[0].y
        };
    }

    /**
     * Get food position.
     */
    getFood() {
        if (!this.food) {
            return null;
        }

        return {
            x: this.food.x,
            y: this.food.y
        };
    }

    /**
     * Get board width.
     */
    getBoardWidth() {
        if (
            Number.isInteger(
                this.config.boardWidth
            )
        ) {
            return this.config.boardWidth;
        }

        return 20;
    }

    /**
     * Get board height.
     */
    getBoardHeight() {
        if (
            Number.isInteger(
                this.config.boardHeight
            )
        ) {
            return this.config.boardHeight;
        }

        return 20;
    }

    /**
     * Check board dimensions.
     */
    validateBoard() {
        if (
            !Number.isInteger(
                this.width
            ) ||
            this.width <= 0
        ) {
            throw new Error(
                `Invalid board width: ${this.width}`
            );
        }

        if (
            !Number.isInteger(
                this.height
            ) ||
            this.height <= 0
        ) {
            throw new Error(
                `Invalid board height: ${this.height}`
            );
        }
    }

    /**
     * Check whether a cell is
     * inside the board.
     */
    // isInsideBoard(cell) {
    //     return (
    //         cell.x >= 0 &&
    //         cell.x < this.width &&
    //         cell.y >= 0 &&
    //         cell.y < this.height
    //     );
    // }

    /**
     * Compare cells.
     */
    // sameCell(a, b) {
    //     return (
    //         a.x === b.x &&
    //         a.y === b.y
    //     );
    // }

    /**
     * Create unique cell key.
     */
    // positionKey(x, y) {
    //     return `${x},${y}`;
    // }

    /**
     * Return calculated path.
     */
    getPath() {
        return this.path.map(
            cell => ({
                x: cell.x,
                y: cell.y
            })
        );
    }

    /**
     * Return strategy name.
     */
    getName() {
        return "BFS";
    }

    /**
     * Return search statistics.
     */
    getSearchNodes() {
        return this.searchNodes;
    }

    /**
     * Reset current search state.
     */
    reset() {
        this.path = [];
        this.nextDirection = null;
        this.searchNodes = 0;
    }
}