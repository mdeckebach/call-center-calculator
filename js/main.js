import { initializeChart , updateChart } from './chart.js'


/**
 * On Load Functions
 */

// Activate form tooltips on page load
document.addEventListener('DOMContentLoaded', function(){
    let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    let tooltipList = tooltipTriggerList.map(function(element){
        return new bootstrap.Tooltip(element, {
            container: 'body',
            trigger : 'focus'
        });
    });
});

// Display empty chart
document.addEventListener("DOMContentLoaded", initializeChart('chart'));


/**
 * On Submit Functions - runs whenever form is submitted
 */

// Initialize worker and listener for form submission
var worker = null;
if (window.Worker) {
    worker = new Worker("/js/worker.js");
    document.getElementById('input_form').addEventListener('submit', startWorker);
} else {
    alert("Workers are not supported. Please use a different browser.");
}

// Start worker
function startWorker() {
    initializeChart('chart');
    updateProgress(0);
    worker.postMessage(getInputs());
}

// Read form inputs into dictionary to pass to worker
function getInputs() {
    let dict = {
        contacts: parseInt(document.getElementById('contacts').value),
        aht: parseInt(document.getElementById('aht').value),
        sl_percent: document.getElementById('sl_percent').value / 100,
        sl_threshold: parseInt(document.getElementById('sl_threshold').value),
        period: parseInt(document.getElementById('period').value),
        max_occupancy: document.getElementById('max_occupancy').value / 100,
        std_dev: document.getElementById('std_dev').value,
        simulations: document.getElementById('simulations').value
    };
    return dict;
}


/**
 * On Message Receipt Functions - runs whenever worker sends progress update or completes
 */

// Listener for when worker sends a message back
worker.addEventListener("message", onMessageReceive);

function onMessageReceive(e) {
    switch (e.data.type) {
        case "start":
            break;
        case "progress":
            updateProgress(e.data.value);
            break;
        case "complete":
            updateProgress(100);
            updateChart('chart', e.data.value);
            break;
        case "debug":
            console.log(e.data);
            break;
    }
}

// Updates the progress bar
function updateProgress(num) {
    num = Math.round(num);
    document.getElementsByClassName('progress-bar').item(0).setAttribute('aria-valuenow', num);
    document.getElementsByClassName('progress-bar').item(0).setAttribute('style', 'width: ' + num +'%');
    document.getElementsByClassName('progress-bar-title').item(0).innerHTML = num + '%';
}