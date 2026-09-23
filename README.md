# Minimal Snake

A dependency-free, responsive Snake game built with HTML5 Canvas, CSS, and vanilla JavaScript.

## Run

Open `index.html` in a modern browser. No installation or server is required.

## Controls

- Arrow keys or WASD: steer (the first direction starts the game)
- Space: pause/resume
- Enter or R: restart
- On small screens: use the directional buttons

## Notes

The best score is saved when browser storage is available; the game remains functional when it is not. The public `window.snakeGame.setDirection("UP")` interface is the intended handoff point for a future AI controller.
