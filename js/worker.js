// External libraries
importScripts('https://cdn.jsdelivr.net/npm/big.js@6.0.0/big.min.js');

// Global variables
const EXTRA_AGENTS = 5

self.addEventListener("message", onMessageReceive);


function onMessageReceive(e) {
    let dict = e.data;
    calc(dict);
}

function calc(dict) {

    // ERLANG C ///////////////////////////////////////////////////////////////
    // Calculate Erlang C results starting at the base number of agents and 
    // incrementing until SL & occupancy criteria are met, where:
    // x-axis = agents; y-axis = service level; z-axis (tooltip) = occupancy
    let erlang = erlangs(dict['contacts'], dict['aht'], dict['period']);
    let base = base_agents(erlang);
    let x = [], y_erlang = [], z = [], erlang_passes_criteria = [], sim_passes_criteria = [];
    let i = -1;
    do {
        i++;
        x[i] = base + i;
        y_erlang[i] = service_level(erlang, x[i], dict['aht'], dict['sl_threshold']);
        z[i] = occupancy(erlang, x[i]);

        // Populate an array with 0 if fails criteria or 1 if passes
        if (y_erlang[i] < dict['sl_percent']) {
            erlang_passes_criteria[i] = 0;
        } else {
            erlang_passes_criteria[i] = 1;
        }
    } while (x.length < EXTRA_AGENTS || 
        y_erlang[x.length - EXTRA_AGENTS] < dict['sl_percent'] ||
        z[x.length - EXTRA_AGENTS] > dict['max_occupancy']);


    // SIMULATION /////////////////////////////////////////////////////////////
    let y_sim = [];

    for (index in x) {
        let cumulative_sl = 0;

        for(var s = 0; s < dict['simulations']; s++) {
            cumulative_sl += simulate(dict['contacts'], x[index], dict['aht'], dict['std_dev'], dict['period'], dict['sl_threshold']);
        }
        y_sim[index] = cumulative_sl / dict['simulations'];
        
        if (y_sim[index] < dict['sl_percent']) {
            sim_passes_criteria[index] = 0;
        } else {
            sim_passes_criteria[index] = 1;
        }

        // progress bar
        var cur_progress = (Number(index) + 1) / x.length * 100;
        postMessage({type: "progress", value: cur_progress});
    }

    // Bundle everything up to pass back to main
    let results = {
        inputs: dict, 
        x: x, 
        y_erlang: y_erlang, 
        y_sim: y_sim, 
        z: z, 
        erlang_passes_criteria: erlang_passes_criteria,
        sim_passes_criteria: sim_passes_criteria
    }
    postMessage({type: "complete", value: results});

}





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
// threshold in seconds
function service_level(erlangs, agents, aht, sl_threshold) {
    let exponent = -((agents - erlangs) * (sl_threshold / aht));
    let v_prob_contact_waits = prob_contact_waits(erlangs, agents);

    return Math.max(1 - (v_prob_contact_waits * Math.exp(exponent)),0);          //////// ADD INFO ON WHY max of 0???
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




/**
 * Simulation Functions
 * 
 * These functions calculate staffing according to a simulation model
 */

// Return a random start time within the period as seconds from the start of the period
function rand_start_time(period) {
    return Math.floor(Math.random() * period * 60);
}

// Standard Normal variate using Box-Muller transform.
function rand_bm() {
    return Math.sqrt( -2.0 * Math.log( 1 - Math.random() ) ) * Math.cos( 2.0 * Math.PI * Math.random() );
}

// Returns a positive integer representing a handle time duratin in seconds, 
// normally distrubted around aht with a given standard deviation
function rand_handle_time(aht, std_dev) {
    let handle_time = Math.round((rand_bm() * std_dev) + aht);
    if (handle_time <= 0) {
        handle_time = rand_handle_time(aht, std_dev);
    }
    return handle_time;
}

// Contact class
class SimEvent {
    constructor(type, start_time, handle_time) {
        this.type = type;
        this.start_time = start_time;
        this.handle_time = handle_time; // PLACEHOLDER
    }

    valueOf() {
        return this.start_time;
    }
}

// Queue class used as base of simulation
 class Queue {
    constructor() {
        this.items = [];
    }

    enqueue(item) {
        this.items.push(item);
    }

    dequeue() {
        if(this.isEmpty()) {
            return "Attempt to dequeue empty queue";
        }
        return this.items.shift();
    }

    peek() {
        if(this.isEmpty()) {
            return "Attempt to peek empty queue";
        }
        return this.items[0];
    }

    isEmpty() {
        return this.items.length == 0;
    }
}

// Priority Queue class used as base of simulation
class PriorityQueue {
    constructor() {
        this.items = [];
    }

    enqueue(item) {
        
        if (this.isEmpty()) {
            this.items.push(item);
        }
        else {
            let index = this.items.findIndex((element) => element > item);
            
            if (index === -1) {
                this.items.push(item);
            }
            else {
                this.items.splice(index, 0, item);
            }
        }
    }

    dequeue() {
        if(this.isEmpty()) {
            return "Attempt to dequeue empty priority queue";
        }
        return this.items.shift();
    }

    peek() {
        if(this.isEmpty()) {
            return "Attempt to peek empty priority queue";
        }
        return this.items[0];
    }

    isEmpty() {
        return this.items.length == 0;
    }
}

// Generates a sample of calls with a target mean and roughly following a 
// normal distribution. Makes sure to avoid any negative numbers
function generate_arrivals(count, period, target_aht, target_std_dev) {

    let sample = [];
    let total_handle_time = 0;
    
    for (var i = 0; i < count; i++) {
        sample[i] = new SimEvent('A', period, target_aht, target_std_dev);
        total_handle_time += sample[i].handle_time;
    }
    
    let sample_aht = total_handle_time / count;

    return adjust_handle_times(target_aht, sample, sample_aht);

}

function adjust_handle_times(target_aht, sample, sample_aht) {
    let delta = 0, count = sample.length;

    if (sample_aht <= target_aht) {
        delta = target_aht - Math.ceil(sample_aht);

        for (var i = 0; i < count; i++) {
            sample[i].handle_time += delta;
        }        
    }
    else {
        delta = Math.floor(sample_aht) - target_aht;

        for (var i = 0; i < count; i++) {
            sample[i].handle_time = Math.max(sample[i].handle_time - delta, 1);
        }
    }

    return sample;
}

function simulate(contacts, agents, aht, std_dev, period, sl_threshold) {

    // Global variables used by event-driven simulation
    let events = new PriorityQueue();
    let queue = new Queue();
    let available_agents = agents; // PLACEHOLDER - WILL PARAMATERIZE
    let contacts_exceeding_sl = 0;
    
    // Generate contact start and handle times, and load them into the queue of events
    for (let i = 0; i < contacts; i++) {
        new_arrival = new SimEvent('A', rand_start_time(period), rand_handle_time(aht, std_dev));
        events.enqueue(new_arrival);
    }
    
    while (!events.isEmpty()) {
        
        var cur_event = events.peek();
        events.dequeue();
    
        if (cur_event.type === 'A'){
    
            if (queue.isEmpty() && available_agents > 0) {
                var end_time = cur_event.start_time + cur_event.handle_time;
                events.enqueue(new SimEvent('D', end_time, 0));
                available_agents--;
            }
            else {
                queue.enqueue(cur_event);
            }
        }
        else if (cur_event.type === 'D') {
            
            if (!queue.isEmpty()) {
                var next_in_line_start = queue.peek().start_time;
                var cur_time = cur_event.start_time;
                var queue_time = cur_time - next_in_line_start;
    
                if (queue_time >= sl_threshold) {
                    contacts_exceeding_sl++;
                }
    
                var end_time = cur_time + queue.peek().handle_time;
                events.enqueue(new SimEvent('D', end_time, 0));
                queue.dequeue();
            }
            else {
                available_agents++;
            }
        }
        else {
            console.log('Error: Unknown event type');
        }
    }
    
    return (contacts - contacts_exceeding_sl) / contacts;
}

