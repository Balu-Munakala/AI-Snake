"use strict";

function sameCell(a, b) {
    return (
        a.x === b.x &&
        a.y === b.y
    );
}


function isInsideBoard(
    cell,
    width,
    height
) {
    return (
        cell.x >= 0 &&
        cell.x < width &&
        cell.y >= 0 &&
        cell.y < height
    );
}


function getNeighbors(cell) {
    return [
        {x: cell.x + 1, y: cell.y},
        {x: cell.x - 1, y: cell.y},
        {x: cell.x, y: cell.y + 1},
        {x: cell.x, y: cell.y - 1}
    ];
}


function getDirection(from, to) {

    const dx =
        to.x - from.x;

    const dy =
        to.y - from.y;

    if (dx === 1 && dy === 0) {
        return "RIGHT";
    }

    if (dx === -1 && dy === 0) {
        return "LEFT";
    }

    if (dx === 0 && dy === 1) {
        return "DOWN";
    }

    if (dx === 0 && dy === -1) {
        return "UP";
    }

    return null;
}


function positionKey(x, y) {
    return `${x},${y}`;
}


function manhattanDistance(a, b) {
    return (
        Math.abs(a.x - b.x) +
        Math.abs(a.y - b.y)
    );
}