var worker = null;


if (window.Worker) {
    worker = new Worker("/js/worker.js");
    document.getElementById('calc_btn').addEventListener('click', startWorker);
} else {
    alert("Workers are not supported. Please use a different browser.");
}

// Start worker
function startWorker() {
    initializeChart();
    updateProgress(0);
    worker.postMessage(getInputs());
}

// When worker sends a message back
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
            updateChart(e.data.value);
            break;
        case "debug":
            console.log(e.data);
            break;
    }
}

// Read form inputs into dictionary to be passed to worker
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

// Updates the progress bar
function updateProgress(num) {
    num = Math.round(num);
    document.getElementsByClassName('progress-bar').item(0).setAttribute('aria-valuenow', num);
    document.getElementsByClassName('progress-bar').item(0).setAttribute('style', 'width: ' + num +'%');
    document.getElementsByClassName('progress-bar-title').item(0).innerHTML = num + '%';
}

/**
 * On Load Functions
 * 
 * The following functions run upon page load to activate tooltips and 
 * display the empty chart body
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
document.addEventListener("DOMContentLoaded", initializeChart);


function set_colors(marker) {
    if (marker) {
        return 'rgb(25,135,84)'
    } else {
        return 'rgb(220,53,69)'
    }
}

function set_shapes(marker) {
    if(marker) {
        return 'circle'
    } else {
        return 'x'
    }
}


function updateChart(results) {
    
    // console.log(results)

    let erlang_marker_shape = results['erlang_passes_criteria'].map(set_shapes);
    let erlang_marker_color = results['erlang_passes_criteria'].map(set_colors);
    let sim_marker_shape = results['sim_passes_criteria'].map(set_shapes);
    let sim_marker_color = results['sim_passes_criteria'].map(set_colors);
    
    // Set up SL line
    let y_sl = [];
    for (let i = 0; i < results['x'].length; i++) {
        y_sl[i] = results['inputs']['sl_percent'];
    }

    // Label for SL Line
    let sl_annotation = {
        x: results['x'][0],
        y: results['inputs']['sl_percent'],
        text: (results['inputs']['sl_percent'] * 100) + '%',
        xanchor: 'left',
        yanchor: 'bottom',
        font: {color: 'rgba(120,120,120,1)'},
        showarrow: false
    }
    
    var update_sl = {
        x: [results['x']],
        y: [y_sl],
        hoverinfo: 'skip',
        mode: 'lines',
        line: {
            color: 'rgba(189,189,189,1)',
            size: 1,
            dash: 'dash'
        },
        visible: 'true',
        name: 'Target Service Level',
    }


    var update_erlang = {
        x: [results['x']],
        y: [results['y_erlang']],
        customdata: [results['z']],
        cliponaxis: false,
        mode: 'lines_markers',
        line: {
            color:  'rgb(52,58,64)'
        },
        marker: {
            color: erlang_marker_color,
            size: 11,
            symbol: erlang_marker_shape,
            line: {
                color: 'rgb(52,58,64',
                width: 1
            }
        },
        visible: 'true',
        name: 'Erlang C',
        hovertemplate:
        '<b>ERLANG C</b>' + '<br>' +
        'Agents: %{x}' + '<br>' +
        'Service Level: %{y: .1%}' + '<br>' +
        'Occupancy: %{customdata: .1%}' +
        '<extra></extra>'
    }

    var update_sim = {
        x: [results['x']],
        y: [results['y_sim']],
        customdata: [results['z']],
        cliponaxis: false,
        mode: 'lines_markers',
        line: {
            color: 'rgb(255,193,7)'
        },
        marker: {
            size: 11,
            color: sim_marker_color,
            symbol: sim_marker_shape,
            line: {
                color: 'rgb(255,193,7)',
                width: 1
            }
        },
        visible: 'true',
        name: 'Computer Simulation',
        hovertemplate:
        '<b>SIMULATION</b>' + '<br>' +
        'Agents: %{x}' + '<br>' +
        'Service Level: %{y: .1%}' + '<br>' +
        'Occupancy: %{customdata: .1%}' +
        '<extra></extra>'
    }

    Plotly.restyle('chart', update_sl, 0);   
    Plotly.relayout('chart', {
        annotations: [sl_annotation]
    }); 
    Plotly.restyle('chart', update_sim, 1);    
    Plotly.restyle('chart', update_erlang, 2);


}


function initializeChart() {
     
    let sl_trace = {
        visible: 'false'
    }

    let simulation_trace = {
        visible: 'false'
    };
    
    let erlang_trace = {
        visible: 'false'
    };

    let data = [sl_trace, simulation_trace, erlang_trace];

    let layout = {
        title: 'Results',
        legend: {
            x: 1,
            xanchor: 'right',
            y: 0,
            yanchor: 'bottom'
        },
        hoverlabel: {
            bgcolor: '#FFF',
            font: {
                size: 16
            }
        },
        xaxis: {
            showgrid: false,
            showticklabels: true,
            linecolor: 'rgb(204,204,204)',
            linewidth: 2,
            ticks: 'outside',
            tickcolor: 'rgb(204,204,204)',
            tickwidth: 2,
            ticklen: 5,
            title: 'Agents Staffed',
            zeroline: false,
            dtick: 1
        },
        yaxis: {
            showgrid: false,
            tickformat: ',.0%',
            range: [0,1],
            title: 'Service Level',
        },
        font: {
            size: 16
        }
    };
    let config = {
        responsive: true,
        displayModeBar: false
    };
    
    Plotly.newPlot('chart', data, layout, config);
    
};