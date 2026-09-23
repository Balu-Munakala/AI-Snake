"use strict";

const AI_STRATEGIES = {
    hamiltonian: HamiltonianAI,
    bfs: BFSAI,
    "safe-bfs": SafeBFSAI
};


function createAI(strategy, config) {

    const AIClass =
        AI_STRATEGIES[strategy];

    if (!AIClass) {
        throw new Error(
            `Unsupported AI strategy: ${strategy}`
        );
    }

    return new AIClass(config);
}


const AIRegistry = Object.freeze({

    getStrategies() {
        return Object.keys(
            AI_STRATEGIES
        );
    },

    hasStrategy(strategy) {
        return Boolean(
            AI_STRATEGIES[strategy]
        );
    },

    create(strategy, config) {
        return createAI(
            strategy,
            config
        );
    }

});