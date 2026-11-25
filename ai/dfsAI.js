
"use strict";

/**
 * Depth-First Search AI for Snake.
 *
 * Explores one path as deeply as possible before
 * backtracking. Does not guarantee the shortest path.
 */
class DFSAI extends AIInterface {
    constructor(config) {
        if (!config) {
            throw new Error("DFS AI requires a game configuration.");
        }
        super(config);

        this.width = 0;
        this.height = 0;

        this.path = [];
        this.nextDirection = null;
        this.searchNodes = 0;
        this.initialized = false;
    }

    initialize() {
        this.width = this.getBoardWidth();
        this.height = this.getBoardHeight();

        this.validateBoard();

        this.path = [];
        this.nextDirection = null;
        this.searchNodes = 0;

        this.initialized = true;
    }

    getNextDirection() {
        if (!this.initialized) {
            this.initialize();
        }

        this.path = [];
        this.nextDirection = null;
        this.searchNodes = 0;

        const head = this.getSnakeHead();
        const food = this.getFood();

        if (!head || !food || sameCell(head, food)) {
            return null;
        }

        const path = this.findPath(head, food);

        if (!path || path.length < 2) {
            return null;
        }

        this.path = path;
        this.nextDirection = getDirection(head, path[1]);

        return this.nextDirection;
    }

    /**
     * Find a path using Depth-First Search.
     */
    findPath(start, target) {
        const stack = [start];
        const visited = new Set();
        const parent = new Map();
        const blocked = new Set();

        for (const segment of this.snake) {
            blocked.add(positionKey(segment.x, segment.y));
        }

        const startKey = positionKey(start.x, start.y);
        const targetKey = positionKey(target.x, target.y);

        blocked.delete(startKey);
        visited.add(startKey);
        parent.set(startKey, null);

        while (stack.length > 0) {
            const current = stack.pop();
            this.searchNodes++;

            const currentKey = positionKey(current.x, current.y);

            if (currentKey === targetKey) {
                return this.reconstructPath(parent, targetKey, start);
            }

            const neighbors = getNeighbors(current);

            // Sort neighbors so that those closer to target are popped first (pushed last)
            neighbors.sort((a, b) => {
                const distA = Math.abs(a.x - target.x) + Math.abs(a.y - target.y);
                const distB = Math.abs(b.x - target.x) + Math.abs(b.y - target.y);
                return distB - distA; // Descending order, so smallest distance is pushed last
            });

            for (const neighbor of neighbors) {
                if (!isInsideBoard(neighbor, this.width, this.height)) {
                    continue;
                }

                const neighborKey = positionKey(neighbor.x, neighbor.y);

                if (visited.has(neighborKey) || blocked.has(neighborKey)) {
                    continue;
                }

                visited.add(neighborKey);
                parent.set(neighborKey, currentKey);
                stack.push(neighbor);
            }
        }

        return null;
    }

    /**
     * Reconstruct path from target back to start.
     */
    reconstructPath(parent, targetKey, start) {
        const reversedPath = [];
        let currentKey = targetKey;

        while (currentKey !== null) {
            const [x, y] = currentKey.split(",").map(Number);
            reversedPath.push({ x, y });
            currentKey = parent.get(currentKey);
        }

        reversedPath.reverse();

        if (
            reversedPath.length === 0 ||
            !sameCell(reversedPath[0], start)
        ) {
            return null;
        }

        return reversedPath;
    }

    getSnakeHead() {
        if (!Array.isArray(this.snake) || this.snake.length === 0) {
            return null;
        }

        return {
            x: this.snake[0].x,
            y: this.snake[0].y
        };
    }

    getFood() {
        if (!this.food) {
            return null;
        }

        return {
            x: this.food.x,
            y: this.food.y
        };
    }

    getBoardWidth() {
        return Number.isInteger(this.boardWidth)
            ? this.boardWidth
            : 20;
    }

    getBoardHeight() {
        return Number.isInteger(this.boardHeight)
            ? this.boardHeight
            : 20;
    }

    validateBoard() {
        if (!Number.isInteger(this.width) || this.width <= 0) {
            throw new Error(`Invalid board width: ${this.width}`);
        }

        if (!Number.isInteger(this.height) || this.height <= 0) {
            throw new Error(`Invalid board height: ${this.height}`);
        }
    }

    getPath() {
        return this.path.map(cell => ({ x: cell.x, y: cell.y }));
    }

    getName() {
        return "DFS";
    }

    getSearchNodes() {
        return this.searchNodes;
    }

    getDecisionInfo() {
        return {
            strategy: "dfs",
            reason: this.path.length > 1 ? "path-found" : "no-path",
            nextDirection: this.nextDirection,
            pathLength: Math.max(0, this.path.length - 1),
            searchNodes: this.searchNodes
        };
    }

    reset() {
        this.path = [];
        this.nextDirection = null;
        this.searchNodes = 0;
    }
}
