/**
 * Erlang C Functions
 *
 * These functions calculate staffing according to Erlang C
 *
 * See https://www.callcentrehelper.com/erlang-c-formula-example-121281.htm 
 * for more detail.
 */
 

// Returns erlangs, aka the avg number of concurrent contacts. AHT is input in 
// seconds while period should be in minutes
function erlangs(contacts, aht, period) {
    return (contacts * (aht / 60) / period)
}

// Returns the probably a contact is not answered immediately and queues.
// It relies on two helper functions called top & bottom, where:
// prob_contact_waits = top / (bottom + top). These each use the Big data type
// to handle factorials too large to be stored as a number.
function prob_contact_waits(erlangs, agents) {
    let top = prob_contact_waits_top(erlangs, agents);
    let bottom = prob_contact_waits_bottom(erlangs, agents);

    return top.div(bottom.plus(top));
}
 
function prob_contact_waits_top(erlangs, agents) {
    let pow = new Big(Math.pow(erlangs, agents));
    let fact = new Big(factorial(agents));
    let right = agents / (agents - erlangs);

    return pow.div(fact).times(right);
}

function prob_contact_waits_bottom(erlangs, agents) {
    let result = new Big(0);
    for (let i = 0; i < agents; i++) {
        let numerator = new Big(erlangs).pow(i);
        let denominator = new Big(factorial(i));
        result = result.plus(numerator.div(denominator));
    }
    return result;
}
 
// Returns the factorial of numbers too large to be stored as number data type
// by using BIG type. Result is returned as a string
function factorial(n) {
    let result = new Big(1);
    for (let i = 2; i <= n; i++) {
        result = result.times(i);
    }
    return result.toFixed();
}
 
// Returns expected service level given erlangs (contact intensity),
// agents (int num of ppl taking contacts), AHT in seconds, and service level
// threshold in seconds. Returns 0 in special case where value is negative
function service_level(erlangs, agents, aht, sl_threshold) {
    let exponent = -((agents - erlangs) * (sl_threshold / aht));
    let v_prob_contact_waits = prob_contact_waits(erlangs, agents);

    return Math.max(1 - (v_prob_contact_waits * Math.exp(exponent)),0);
}
 
// Returns the average time contacts wait in the queue (ASA) in SECONDS
function avg_speed_of_answer(erlangs, agents, aht, prob_contact_waits) {
    let numerator = prob_contact_waits * aht;
    let denominator = agents - erlangs;

    return numerator / denominator;
}
 
// Returns the % of time an agent is handling contacts. 1 - occupancy = availability
function occupancy(erlangs, agents) {
    return erlangs / agents;
}

// Returns the minimum number of agents to simulate / calculate Erlang C
function base_agents(erlangs) {
    return Math.floor(erlangs) + 1;
}