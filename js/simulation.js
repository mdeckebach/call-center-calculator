/**
 * Simulation Functions
 * 
 * These functions calculate staffing according to a simulation model
 */

function simulate(contacts, agents, aht, std_dev, period, sl_threshold) {

    // Global variables used by event-driven simulation
    let events = new PriorityQueue();
    let queue = new Queue();
    let available_agents = agents;
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

// Return a random start time within the period as seconds from the start of the period
function rand_start_time(period) {
    return Math.floor(Math.random() * period * 60);
}

// Returns a positive integer representing a handle time duratin in seconds, 
// normally distributed around aht with a given standard deviation
function rand_handle_time(aht, std_dev) {
    let handle_time = Math.round((rand_bm() * std_dev) + aht);
    if (handle_time <= 0) {
        handle_time = rand_handle_time(aht, std_dev);
    }
    return handle_time;
}

// Standard Normal variate using Box-Muller transform.
function rand_bm() {
    return Math.sqrt( -2.0 * Math.log( 1 - Math.random() ) ) * Math.cos( 2.0 * Math.PI * Math.random() );
}

// Contact class
class SimEvent {
    constructor(type, start_time, handle_time) {
        this.type = type;
        this.start_time = start_time;
        this.handle_time = handle_time;
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
