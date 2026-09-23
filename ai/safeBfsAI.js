"use strict";

/**
 * Safe BFS AI for Snake.
 *
 * Strategy:
 *
 * 1. Generate possible first moves.
 * 2. For every first move:
 *      - simulate the move
 *      - find a BFS path to food
 *      - simulate that complete path
 *      - check whether the snake can still reach its tail
 * 3. Choose the shortest SAFE path to food.
 * 4. If no safe food path exists:
 *      - choose a move that leaves the largest
 *        reachable area.
 *
 * Unlike normal BFS, Safe BFS considers
 * what happens after reaching the food.
 */
class SafeBFSAI {

    constructor(config) {

        if (!config) {
            throw new Error(
                "Safe BFS AI requires a game configuration."
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
     * Main AI decision.
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

        if (
            sameCell(
                head,
                food
            )
        ) {
            return null;
        }


        /*
         * ---------------------------------------------
         * 1. Find SAFE paths to food.
         * ---------------------------------------------
         */

        const safeFoodCandidates =
            this.findSafeFoodPaths(
                head,
                food
            );


        if (
            safeFoodCandidates.length > 0
        ) {

            /*
             * Shortest safe path wins.
             */
            safeFoodCandidates.sort(
                (a, b) =>
                    a.path.length -
                    b.path.length
            );

            const selected =
                safeFoodCandidates[0];

            this.path =
                selected.path;

            this.nextDirection =
                getDirection(
                    head,
                    selected.path[1]
                );

            return this.nextDirection;
        }


        /*
         * ---------------------------------------------
         * 2. No safe food path.
         *
         * Preserve maximum space.
         * ---------------------------------------------
         */
        
        const fallback =
        this.findBestSurvivalMove(
            head,
            food
        );

        if (!fallback) {
            return null;
        }

        this.path =
            fallback.path;

        this.nextDirection =
            getDirection(
                head,
                fallback.path[1]
            );

        return this.nextDirection;
    }


    /**
     * Find all first moves that can eventually
     * reach food safely.
     */
    findSafeFoodPaths(
        head,
        food
    ) {

        const candidates = [];

        const neighbors =
            getNeighbors(head);


        for (
            const firstMove
            of neighbors
        ) {

            /*
             * First move must be inside board.
             */
            if (
                !isInsideBoard(
                    firstMove, this.width, this.height
                )
            ) {
                continue;
            }


            /*
             * Simulate the first movement.
             */
            const afterFirstMove =
                this.simulateMove(
                    this.snake,
                    firstMove
                );


            if (!afterFirstMove) {
                continue;
            }


            /*
             * Find shortest path from the
             * new state to food.
             */
            const remainingPath =
                this.findPath(
                    afterFirstMove,
                    afterFirstMove[0],
                    food,
                    true
                );


            if (
                !remainingPath ||
                remainingPath.length < 1
            ) {
                continue;
            }


            /*
             * Combine:
             *
             * current head
             *      +
             * remaining path
             */
            const completePath = [
                head,
                ...remainingPath
            ];


            /*
             * The path must actually end at food.
             */
            const last =
                completePath[
                    completePath.length - 1
                ];

            if (
                !sameCell(
                    last,
                    food
                )
            ) {
                continue;
            }


            /*
             * Simulate the entire food path.
             */
            const afterFood =
                this.simulatePath(
                    this.snake,
                    completePath
                );


            if (!afterFood) {
                continue;
            }


            /*
             * After eating food, determine whether
             * the head can still reach the tail.
             */
            const simulatedHead =
                afterFood[0];

            const simulatedTail =
                afterFood[
                    afterFood.length - 1
                ];


            const tailPath =
                this.findPath(
                    afterFood,
                    simulatedHead,
                    simulatedTail,
                    true
                );


            /*
             * If the tail is reachable, this food
             * route is considered safe.
             */
            if (
                tailPath &&
                tailPath.length >= 2
            ) {

                candidates.push({
                    path: completePath
                });
            }
        }


        return candidates;
    }


    /**
     * If no safe food path exists, choose a move
     * that leaves the largest reachable area.
     */
    findBestSurvivalMove(
        head,
        food
    ) {

        const candidates = [];

        const neighbors =
            getNeighbors(head);


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


            const simulatedSnake =
                this.simulateMove(
                    this.snake,
                    neighbor
                );


            if (!simulatedSnake) {
                continue;
            }


            /*
             * Count how much free space remains.
             */
            const reachableArea =
                this.calculateReachableArea(
                    simulatedSnake,
                    simulatedSnake[0]
                );

            const simulatedHead =
                simulatedSnake[0];

            const simulatedTail =
                simulatedSnake[
                    simulatedSnake.length - 1
                ];

            const tailPath =
                this.findPath(
                    simulatedSnake,
                    simulatedHead,
                    simulatedTail,
                    true
                );

            const canReachTail =
                tailPath !== null &&
                tailPath.length >= 2;


            /*
             * Also calculate distance to food.
             *
             * This means that when two moves have
             * similar survival space, we prefer the
             * one closer to food.
             */
            const distanceToFood =
                manhattanDistance(
                    neighbor,
                    food
                );


            candidates.push({
                path: [
                    head,
                    neighbor
                ],
                
                canReachTail,

                reachableArea,

                distanceToFood
            });
        }


        if (
            candidates.length === 0
        ) {
            return null;
        }


        /*
         * Prefer:
         *
         * 1. Larger reachable area
         * 2. Smaller distance to food
         */
        candidates.sort(
            (a, b) => {

                if (
                    a.canReachTail !==
                    b.canReachTail
                ) {
                    return (
                        Number(b.canReachTail) -
                        Number(a.canReachTail)
                    );
                }

                if (
                    b.reachableArea !==
                    a.reachableArea
                ) {
                    return (
                        b.reachableArea -
                        a.reachableArea
                    );
                }

                return (
                    a.distanceToFood -
                    b.distanceToFood
                );
            }
        );


        return candidates[0];
    }


    /**
     * Simulate one movement.
     *
     * Returns null if the movement causes
     * an immediate collision.
     */
    simulateMove(
        snakeState,
        nextHead
    ) {

        if (
            !isInsideBoard(
                nextHead, this.width, this.height
            )
        ) {
            return null;
        }


        const willEat =
            this.food &&
            sameCell(
                nextHead,
                this.food
            );


        /*
         * Everything except the tail is
         * immediately occupied.
         *
         * The tail moves away unless food
         * is eaten.
         */
        const bodyToCheck =
            willEat
                ? snakeState
                : snakeState.slice(
                    0,
                    -1
                );


        for (
            const segment
            of bodyToCheck
        ) {

            if (
                sameCell(
                    segment,
                    nextHead
                )
            ) {

                return null;
            }
        }


        const result =
            snakeState.map(
                segment => ({
                    x: segment.x,
                    y: segment.y
                })
            );


        result.unshift({
            x: nextHead.x,
            y: nextHead.y
        });


        /*
         * If food isn't eaten,
         * tail moves away.
         */
        if (!willEat) {
            result.pop();
        }


        return result;
    }


    /**
     * Simulate a complete path.
     */
    simulatePath(
        originalSnake,
        path
    ) {

        let currentSnake =
            originalSnake.map(
                segment => ({
                    x: segment.x,
                    y: segment.y
                })
            );


        for (
            let i = 1;
            i < path.length;
            i++
        ) {

            const nextSnake =
                this.simulateMove(
                    currentSnake,
                    path[i]
                );


            if (!nextSnake) {
                return null;
            }


            currentSnake =
                nextSnake;
        }


        return currentSnake;
    }


    /**
     * BFS pathfinding.
     */
    findPath(
        snakeState,
        start,
        target,
        allowTail
    ) {

        const queue = [];

        let queueIndex = 0;

        const visited =
            new Set();

        const parent =
            new Map();

        const blocked =
            new Set();


        /*
         * Mark snake body as blocked.
         */
        for (
            const segment
            of snakeState
        ) {

            blocked.add(
                positionKey(
                    segment.x,
                    segment.y
                )
            );
        }


        /*
         * Head is always searchable.
         */
        blocked.delete(
            positionKey(
                start.x,
                start.y
            )
        );


        /*
         * Tail can be entered because it normally
         * moves away during the next movement.
         */
        if (
            allowTail &&
            snakeState.length > 0
        ) {

            const tail =
                snakeState[
                    snakeState.length - 1
                ];

            blocked.delete(
                positionKey(
                    tail.x,
                    tail.y
                )
            );
        }


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


            if (
                currentKey ===
                targetKey
            ) {

                return this.reconstructPath(
                    parent,
                    targetKey,
                    start
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


        return null;
    }


    /**
     * Calculate how many cells can be reached
     * from the current head.
     */
    calculateReachableArea(
        snakeState,
        start
    ) {

        const blocked =
            new Set();


        /*
         * Keep tail available because it
         * will normally move.
         */
        for (
            let i = 0;
            i < snakeState.length - 1;
            i++
        ) {

            const segment =
                snakeState[i];

            blocked.add(
                positionKey(
                    segment.x,
                    segment.y
                )
            );
        }


        const startKey =
            positionKey(
                start.x,
                start.y
            );


        const queue = [
            start
        ];

        const visited =
            new Set([
                startKey
            ]);


        let index = 0;


        while (
            index < queue.length
        ) {

            const current =
                queue[index];

            index += 1;


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


                const key =
                    positionKey(
                        neighbor.x,
                        neighbor.y
                    );


                if (
                    visited.has(key)
                ) {
                    continue;
                }


                if (
                    blocked.has(key)
                ) {
                    continue;
                }


                visited.add(key);

                queue.push(
                    neighbor
                );
            }
        }


        return visited.size;
    }


    /**
     * Reconstruct BFS path.
     */
    reconstructPath(
        parent,
        targetKey,
        start
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


        reversedPath.reverse();


        if (
            reversedPath.length === 0 ||
            !sameCell(
                reversedPath[0],
                start
            )
        ) {
            return null;
        }


        return reversedPath;
    }


    /**
     * Get neighboring cells.
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
    // getDirection(
    //     from,
    //     to
    // ) {

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
     * Get snake head.
     */
    getSnakeHead() {

        if (
            !Array.isArray(
                this.snake
            ) ||
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
     * Get food.
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
     * Validate board.
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
     * Check board boundaries.
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
     * Manhattan distance.
     */
    // manhattanDistance(
    //     a,
    //     b
    // ) {

    //     return (
    //         Math.abs(a.x - b.x) +
    //         Math.abs(a.y - b.y)
    //     );
    // }


    /**
     * Cell key.
     */
    // positionKey(
    //     x,
    //     y
    // ) {

    //     return `${x},${y}`;
    // }


    /**
     * Return current Safe BFS path.
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
     * Strategy name.
     */
    getName() {

        return "Safe BFS";
    }


    /**
     * Search statistics.
     */
    getSearchNodes() {

        return this.searchNodes;
    }


    /**
     * Reset AI state.
     */
    reset() {

        this.path = [];
        this.nextDirection = null;
        this.searchNodes = 0;
    }
}