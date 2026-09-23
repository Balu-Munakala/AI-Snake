"use strict";

class SnakeEnvironment {

    constructor(config = {}) {

        this.width =
            config.width ?? 20;

        this.height =
            config.height ?? 20;

        this.random =
            config.random ?? Math.random;

        this.snake = [];
        this.food = null;

        this.direction = "RIGHT";

        this.score = 0;

        this.done = false;

        this.won = false;
    }


    /* =========================================================
       RESET
    ========================================================= */

    reset() {

        this.snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];

        this.direction = "RIGHT";

        this.score = 0;

        this.done = false;

        this.won = false;

        this.food =
            this.createFood();

        return this.getState();
    }


    /* =========================================================
       STATE
    ========================================================= */

    getState() {

        return {
            snake: this.snake.map(
                segment => ({
                    x: segment.x,
                    y: segment.y
                })
            ),

            food: this.food
                ? {
                    x: this.food.x,
                    y: this.food.y
                }
                : null,

            direction:
                this.direction,

            score:
                this.score,

            done:
                this.done,

            won:
                this.won
        };
    }


    /* =========================================================
       STEP
    ========================================================= */

    step(action) {

        if (this.done) {

            return {
                state: this.getState(),
                reward: 0,
                done: true,
                won: this.won
            };
        }


        if (!this.isValidDirection(action)) {

            return {
                state: this.getState(),
                reward: -1,
                done: this.done,
                won: this.won
            };
        }


        if (
            this.isOpposite(
                this.direction,
                action
            )
        ) {

            return {
                state: this.getState(),
                reward: -1,
                done: this.done,
                won: this.won
            };
        }


        this.direction =
            action;


        const vector =
            this.getDirectionVector(
                this.direction
            );


        const nextHead = {
            x:
                this.snake[0].x +
                vector.x,

            y:
                this.snake[0].y +
                vector.y
        };


        const willEat =
            this.food &&
            sameCell(
                nextHead,
                this.food
            );


        const bodyToCheck =
            willEat
                ? this.snake
                : this.snake.slice(
                    0,
                    -1
                );


        const hitsWall =
            !isInsideBoard(nextHead, this.width, this.height);

        const hitsBody =
            bodyToCheck.some(
                segment =>
                    sameCell(
                        segment,
                        nextHead
                    )
            );


        if (
            hitsWall ||
            hitsBody
        ) {

            this.done = true;

            return {
                state: this.getState(),
                reward: -1,
                done: true,
                won: false
            };
        }


        this.snake.unshift(
            nextHead
        );


        let reward = -0.01;


        if (willEat) {

            this.score++;

            reward = 1;

            this.food =
                this.createFood();


            if (!this.food) {

                this.done = true;

                this.won = true;

                reward = 10;
            }

        } else {

            this.snake.pop();
        }


        return {
            state: this.getState(),
            reward,
            done: this.done,
            won: this.won
        };
    }


    /* =========================================================
       FOOD
    ========================================================= */

    createFood() {

        const freeCells = [];


        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {

                const cell = {x, y};

                if (!this.snake.some(segment => sameCell(segment, cell))) {
                    freeCells.push(cell);
                }
            }
        }

        if (
            freeCells.length === 0
        ) {

            return null;
        }


        return freeCells[
            Math.floor(
                this.random() *
                freeCells.length
            )
        ];
    }


    /* =========================================================
       HELPERS
    ========================================================= */

    isValidDirection(
        direction
    ) {

        return (
            direction === "UP" ||
            direction === "DOWN" ||
            direction === "LEFT" ||
            direction === "RIGHT"
        );
    }


    getDirectionVector(
        direction
    ) {

        const vectors = {

            UP: {
                x: 0,
                y: -1
            },

            DOWN: {
                x: 0,
                y: 1
            },

            LEFT: {
                x: -1,
                y: 0
            },

            RIGHT: {
                x: 1,
                y: 0
            }
        };


        return vectors[
            direction
        ];
    }


    isOpposite(
        first,
        second
    ) {

        const a =
            this.getDirectionVector(
                first
            );

        const b =
            this.getDirectionVector(
                second
            );


        return (
            a.x + b.x === 0 &&
            a.y + b.y === 0
        );
    }


    // isOccupied(cell) {

    //     return this.snake.some(
    //         segment =>
    //             sameCell(
    //                 segment,
    //                 cell
    //             )
    //     );
    // }


    // isInsideBoard(cell) {

    //     return (
    //         cell.x >= 0 &&
    //         cell.x < this.width &&
    //         cell.y >= 0 &&
    //         cell.y < this.height
    //     );
    // }


    // sameCell(a, b) {

    //     return (
    //         a.x === b.x &&
    //         a.y === b.y
    //     );
    // }
}