export function initializeChart(id) {
     
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
    
    Plotly.newPlot(id, data, layout, config);
};

export function updateChart(id, results) {
    
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

    Plotly.restyle(id, update_sl, 0);   
    Plotly.relayout(id, {
        annotations: [sl_annotation]
    }); 
    Plotly.restyle(id, update_sim, 1);    
    Plotly.restyle(id, update_erlang, 2);
}

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