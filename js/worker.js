// External libraries
importScripts('https://cdn.jsdelivr.net/npm/big.js@6.0.0/big.min.js');
importScripts('./simulation.js');
importScripts('./erlangc.js');

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

        // Update progress bar as you go
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