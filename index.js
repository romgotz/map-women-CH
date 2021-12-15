// Define map and legend dimensions with margins 
const margin = { top: 20, right: 30, bottom: 30, left: 30 },
width = 720 - margin.left - margin.right,
height = 560 - margin.top - margin.bottom,
padding = 20, legendCellSize = 20;

// define dimension and margins for the graph
const margin_graph = { top:20, right: 20, bottom:50, left:65},
width_graph = 487 - margin_graph.left - margin_graph.right, 
height_graph = 340 - margin_graph.top - margin_graph.bottom, 
padding_legend = 5;

// definition of general variables  
var data_series = null, data_obj = {}, selected_year = 1975, colorscale = []; 
const f = d3.format(".2f"); // determine precision of two decimals 

const path = d3.geoPath(), bbox = [485000, 75000, 834000, 296000];

// animation to grasp the user's attention to the sidebar giving explanation of what this is about 
let animation_count = 0;
setTimeout(function(){
$(".explication").addClass('highlight');
animation_count += 1;
}, 3000); // starts after 3 seconds 

// creating the svg that contains the map
const svg = d3.select('#map_area')
    .append('svg')
      .attr('id', 'svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.right + margin.left)
      .attr('class', 'svg')
      .attr('overflow', 'visible'); // to make sure that everything appears 

// creating the svg that contains the graph in the sidebar
const svg_graph = d3.select('#graph_area')
    .append("svg")
        .attr("width", width_graph + margin_graph.left + margin_graph.right)
        .attr("height", height_graph + margin_graph.top + margin_graph.bottom)
        .append("g")
        .attr("transform", `translate(${margin_graph.left}, ${margin_graph.top})`)
        .style('padding', padding)

// Compute the scale of the transform, do it manually
// scaling factors
var scaleX = width / (bbox[2] - bbox[0]),
 scaleY = height / (bbox[3] - bbox[1]);
var scale = Math.min(scaleX, scaleY); // choose the min to avoid distortion 
// apply corresponding translation
var dx = -1 * scale * bbox[0];
var dy = scale * bbox[1] + parseFloat(height);

// transform the map with scaling factor 
let map = svg.append('g')
    .attr('class', 'map')
    .attr(
    'transform', 
    'matrix('+scale+' 0 0 -'+scale+' '+dx+' '+dy+')'
  );

// add tooltip 
var tooltip = addTooltip();

// Construction titre 
svg.append("text")
      .attr('x', (width / 2))
      .attr('y', 0 + margin.top)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
        .text("1975-2020 : Evolution du pourcentage de femmes dans les parlements cantonaux suisses")
        .classed('main-title', true) // class to change it easily

// download the data with the promises (asynchronus)
let promises = [];
promises.push(d3.json('vec200-topo.json'));
promises.push(d3.csv('data_1975_2020.csv'));

Promise.all(promises)
  .then(function(result){
// store the data 
const topojson_geom = result[0], csv = result[1];

// link two files
for (var i = 0; i < csv.length; i++) {
    var canton_id = `${csv[i].id}`;
    data_obj[canton_id] = csv[i];
};

// drawing the map for the selected year 
function updateMap(selected_year){
   
    // remove the legend and the map
      d3.select(".all-legend").remove();
      d3.selectAll('.map-choro').remove(); 

    // Compute the class limits using Jenks (using classybrewer)
    data_series = csv.map(d => +d[selected_year]); // getting the data

    // loop dealing with missing values if there are some 
    for(i = 0; i< data_series.length; i++) {
        if(isNaN(data_series[i])){
            data_series[i] = -1; // to diferentiate them easily 
        }
    }; // end of loop 

    data_series = data_series.filter(function(v){return v >= 0}); // only keeping existing values to do the classification

    // classification using ClassyBrew library
    var brew = new classyBrew();
    brew.setSeries(data_series);
    brew.setNumClasses(5); // using Yule and Huntsberger formulas, gives ~5 classes 
    brew.setColorCode('PuBu');
    var breaks = brew.classify('quantile') // choose between : quantile (equal count), jenks or equal interval --> here quantile as comparison of maps
    var color = d3.scaleThreshold()
        .domain(breaks.slice(1,5))
        .range(brew.getColors());
    
    // updating colorscale 
    for (var i = 0; i < breaks.length - 1; i++) {
        colorscale[i] = color(breaks[i]);
    }; // breaks.length - 1,  otherwise 6 classes instead of 5 
   
    // counting number of cantons per class
    items_classes = [];
    for (var i = 0; i < breaks.length - 1 ; i++) {
      upper_limit = breaks[i+1];
      under_limit = breaks[i];

      if(i === 4) {data = data_series.filter(function(d){ return d >= under_limit && d <= upper_limit})} // for the last class, upper limit is counted in
      else {
        data = data_series.filter(function(d){ return d >= under_limit && d < upper_limit})
      }
      items_classes[i] = d3.count(data) 
    }; 

    // constructing the legend
    var legend = svg.append('g').attr('transform', 'translate(600, 60)').classed('all-legend', true)
    // determining width and height
    var width_legend = 150, height_legend = legendCellSize*10;
    
    // highlight it with line
    legend.append('rect')
      .attr('height', height_legend)
      .attr('width', width_legend+ padding_legend)
      .attr('stroke', 'black')
      .attr('stroke-width', 0.2)
      .attr('fill', 'transparent')
      .attr('x', -2*legendCellSize)
      .attr('y', -legendCellSize); 

    // title of the legend
    legend.append('text')
            .attr("x",2* legendCellSize)
            .attr("y", 0)
            .style("font-size", "13px")
            .style('font-weight', '700')
            .style('text-anchor', 'middle')
                .text("% de femmes en " + selected_year)

    // rectangle for missing data 
    legend_missing = legend.append('g')

    legend_missing
        .append('rect')
          .attr('y', 2*padding_legend)
          .attr('height', legendCellSize + 'px')
          .attr('width', legendCellSize + 'px')
          .attr('x', -legendCellSize - 5)
          .style("fill", "#999")

    legend_missing
        .append("text")
          .attr("x",0)
          .attr('y', 5*padding_legend)
          .style("font-size", "13px")
          .style("color", "#929292")
          .style("fill", "#929292")
              .text("Pas de données");

    // adding rectangles for the classes with interactivity
    legend.selectAll()
      .data(d3.range(colorscale.length))
      .enter()
      .append('rect')
            .attr('height', legendCellSize + 'px')
            .attr('width', legendCellSize + 'px')
            .attr('x', -legendCellSize - padding_legend)
            .attr('y' , d => 8*padding_legend + d * legendCellSize)
            .style('fill', d => colorscale[d])
            .style('stroke', 'black').style('stroke-width', 0.2)
            .attr('class', 'legend-cell')
            .on("mouseover", function(event, d){ 
                legend.select('#cursor')
                    .attr('transform', 'translate(' + (-legendCellSize - 15) + ', ' + ((12*padding_legend) + d* legendCellSize) + ')')
                    .style('display', null)
                d3.selectAll("path[scorecolor='" + colorscale[d] + "']")
                    .style('fill', '#cf9973');
            })
            .on("mouseout", function(event, d){
                legend.select('#cursor')
                    .style('display', 'none');
                d3.selectAll("path[scorecolor='" + colorscale[d] + "']")
                    .style('fill', colorscale[d]);
            })

    // adding scale for the classes
    var legendScale = d3.scalePoint()
    .domain(breaks)
    .range([0, colorscale.length * legendCellSize]);

  legendAxis = legend.append('g')
          .attr("transform", 'translate(0, 40)')
          .transition()
          .call(d3.axisRight(legendScale).tickFormat(d => d + "%"));
    
    // median of the distribution
    legend.append('text')
            .attr("x", -legendCellSize-padding_legend)
            .attr("y", legendCellSize*colorscale.length + 12*padding_legend)
            .style("font-size", "12px")
                .text("Médiane : " + f(d3.median(data_series)) + " %");
    
    // text for the classification method
    legend.append('text')
            .attr("x", 2*legendCellSize)
            .attr("y", legendCellSize*colorscale.length + 15*padding_legend)
            .style("font-size", "12px")
            .style('font-weight', '300')
            .style('text-anchor', 'middle')
                .text("Mise en classe : quantile");

    // adding the number of items per class
    legendItems = legend.append('g')
      .attr("transform", 'translate(-10, 40)')
    for(let i = 0; i <= items_classes.length; i++) {
      legendItems
        .append('text')
        .attr('x', -legendCellSize - padding_legend)
        .attr('y' , 3*padding_legend + i * legendCellSize)
          .text(items_classes[i])
            .style("font-size", "10px"); 
    }

    // adding cursor for interactivity 
    legend.append("polyline")
            .attr("points", -legendCellSize + ",0 " + (-legendCellSize * 0.2) + "," + (-legendCellSize / 2) + " " + -legendCellSize + "," + -legendCellSize)
            .attr("id", "cursor") 
            .style("display", "none")
            .style('fill', "#cf9973");

    // draw the map for the selected year        
    drawMap(selected_year);

    // Drawing the map
    function drawMap(year){
        // selecting the cantons geometries contained in the topojson
        var cantons_geom = topojson.feature(topojson_geom, topojson_geom.objects.cantons).features;
        
        let features = map
            .selectAll('path')
            .data(cantons_geom) 
            .enter()
            .append('path')
                .classed('map-choro', true)
                .attr("scorecolor", function(d){
                var canton_id = `${d.id}`
                var statdata = data_obj[canton_id];
                return statdata[year] >= 0 ? color(+statdata[year]) : '#999'})
                .attr('stroke', 'black').style('stroke-opacity', 0.8)
                .attr('stroke-width', 150) // in meters because of the translation
                .attr('fill', function(d){
                        var canton_id = `${d.id}`
                        var statdata = data_obj[canton_id];
                        return statdata[year] >= 0 ? color(+statdata[year]) : '#999'
                })
                .attr('d', path)
                .on('click', click_map) 
                .on('mouseover', mouseover_map)
                .on('mouseout', mouseout_map)
                
  // defining functions for the interactivity 
  function mouseover_map(event, d){
          var Allcantons = d3.selectAll(".Cantons");
          var canton_id = `${d.id}`;
          var statdata = data_obj[canton_id];
          Allcantons
              .transition()
              .style('opacity', 0.6)
          var selectedCanton = d3.select(this)
          selectedCanton
              .transition()
              .style('fill', '#cf9973');
          tooltip.attr('transform', 'translate(10, 40)'); // define position 
          tooltip.style('display', null)
          tooltip.select('#tooltip-canton')
              .text(statdata.Canton);
          if(statdata[year] >= 0){
          tooltip.select('#tooltip-score')
          .text(statdata[year] + "%");
          legend.select('#cursor')
          .attr('transform', 'translate(' + (-legendCellSize -15) + ', ' + ((12*padding_legend) + (getColorIndex(color(+statdata[year])) * legendCellSize)) +')')
              .style('display', null)} else{
                  tooltip.select('#tooltip-score')
                .text(" / ");
                }; 
  }; // end of mousemove function
  
  function mouseout_map(event, d){
          d3.selectAll(".Cantons")
              .transition()
              // .style('opacity', 0.7)
          d3.select(this)
              .transition()
              .style('stroke', 'black').style('stroke-opacity', 0.8).style('fill', colorscale[d])
          tooltip.style('display', 'none');
          legend.select('#cursor').style('display', 'none');
  }; // end of mouseout

  function click_map(event, d){
        var canton_id = `${d.id}`;
        var statdata = data_obj[canton_id];
        drawGraph(canton_id);
        };
      }; // end of click (adding graph)

function getColorIndex(color) {
    for (var i = 0; i < colorscale.length; i++) {
        if (colorscale[i] === color) {
            return i;
            }
        }
    return -1;
    } // end of getColor

}; // end of updateMap
updateMap(selected_year); // initialise the map for 1975

// Dealing with slider event
      // minus button
      $("#minus").click(function(event) {
        zoom("out"); 
      });
      // plus button
      $("#plus").click(function(event) {
        zoom("in");
      });
      // slider dragging
      $("#range").on('input change', function(event) {
        let selected_year = $(event.currentTarget).val()
        $('#output').text("Année: " + selected_year);
        updateMap(selected_year); 
        d3.selectAll('.main-title').remove();
        addTitle(selected_year)
      });
  
  function zoom(direction) {
    var slider = $("#range");
    var step = parseInt(slider.attr('step'), 10);
    var currentSliderValue = parseInt(slider.val(), 10);
    var selected_year = currentSliderValue + step;
  
    if (direction === "out") {
      selected_year = currentSliderValue - step;
    } else {
      selected_year = currentSliderValue + step;
    }
    slider.val(selected_year).change();
    // updating map and title 
    if (selected_year >= 1975 && selected_year <= 2020) {updateMap(selected_year)}; // condition otherwise map gets drawn for 2021 and 1974 with the buttons (do not know why)
    d3.selectAll('.main-title').remove();
    addTitle(selected_year);
  }; // end zoom 

}); // end of data 

// Drawing the graph 
function drawGraph(canton_id){
    //Read the data
    d3.csv('data_graph.csv')
    .then(function(data) {

    d3.select(".line").remove(); // line
    d3.select(".graph-title").remove(); // title of the graph
    d3.selectAll(".dot").remove(); // circles 
    d3.select('.axeX').remove(); // Xaxis
    d3.select('.axeY').remove(); // Yaxis

    // Selecting data based on the clicked canton  
    const dataFilter = data.filter(function(d){return d.id==canton_id})

    // determining some values for the canton
     var maxYear = d3.max(dataFilter, d => d.annee);
     var minYear = d3.min(dataFilter, d => d.annee);
     var ticksArray = [];
     // getting election years for the Xscale
     for (var i = 0; i < dataFilter.length; i++) {
      ticksArray[i] =  dataFilter[i].annee;
    };

     // Creating the x-axis 
     const x = d3.scaleLinear()
      .domain([(+minYear-1), (+maxYear+1)])
      .range([ 0, width_graph]);

     // adding the new axis with updated data 
     svg_graph.append("g")
         .classed('axeX', true) 
         .attr("transform", `translate(0, ${height_graph})`)
         .transition()
         .duration(1000)
         .call(d3.axisBottom(x).tickValues(ticksArray).tickFormat(d3.format("d")).tickSizeOuter(2).tickPadding(4));

    // Add the legend for x-axis
    svg_graph.append("text")
      .attr("y", height_graph + 25)
      .attr("x", width_graph / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Année");
    
    // Add Y axis 
    const y = d3.scaleLinear()
      .domain([0,100]) // fixed because it is percentage
      .range([ height_graph, 0 ]);

    svg_graph.append("g").call(d3.axisLeft(y)).attr('transform', 'translate(-20,0)').classed('axeY', true); // translate it to be sure % is readable 

    // Add legend to the y-axis 
    svg_graph.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin_graph.right - 42)
        .attr("x", 0 - height_graph/2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Pourcentage de femmes");

    // adding a title to the graph --> conditions according to name
    svg_graph.append("text")
            .attr("class", "graph-title")
            .attr("x", width_graph / 2)
            .attr("y", (0 - margin_graph.top / 2) + 10)
            .attr("text-anchor", "middle")
            .text("Parlement cantonal" + graphTitle(dataFilter[0].canton))

    function graphTitle(cantonName){
        if (cantonName === 'Grisons') {
          return (" des " + cantonName)
        }
        else if (cantonName === 'Valais'|'Jura'|'Tessin') {
          return (" du " + cantonName)
        }
        else if (cantonName === 'Argovie'|'Obwald'|'Uri'|'Appenzell-Rh.-Ext.'|'Appenzell-Rh.-Int.') {
          return (" d " + cantonName)
        }
        else { return (" de " + cantonName)}
    }

    // Creating the line with the selected group
    let line = svg_graph
          .append('g')
          .append("path")
          .datum(dataFilter)
          .attr('class', 'line')
          .attr("d", d3.line()
              .x(d => x(d.annee))
              .y(d => y(d.femmes/d.total*100))
            )
            .attr('stroke', '#728cd7')
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .style("stroke-width", 2)
            .style("fill", "none")
            .call(transition)

      // drawing the circles 
      let circles = svg_graph.selectAll('circles.dot')
        .data(dataFilter)
        .join('circle')
          .attr('class', 'dot')
          .transition().delay(4000)
          .attr('r', 5)
          .attr('fill', 'transparent')
          .attr('stroke', '#728cd7').attr('stroke-width', 1)
          .attr('cx', d => x(d.annee))
          .attr('cy',d => y(d.femmes/d.total*100))
          .attr('opacity', 0)
          .transition().delay(function(d,i){ return i*100})
          .attr('opacity', 1)

       // Adding an interactivity to have precise data when hovering

      // define the focus 
      let focus = svg_graph.append('g').attr('class', 'focus').style('display', 'none');

      // add the line line joining x-axis
      focus
        .append('line')
          .attr('class', 'x')
          .style('stroke', 'blue')
          .style('stroke-dasharray', '3,3')
          .style('opacity',0.5)
          .attr('y1', 0)
          .attr('y2', height_graph);

      // add circles for every data 
      focus
        .append('circle')
          .attr('class', 'y')
          .attr('fill', 'none')
          .attr('r', 5).attr('fill', '#728cd7')
          .attr('stroke', 'white')
      
      // text for the percentage value
      focus
        .append('text')
          .attr('class', 'text-value')
          .attr('stroke', '#728cd7')
          .attr('text-anchor', 'middle')

      // text for the year value 
      focus
        .append('text')
          .attr('class', 'text-year')
          .attr('stroke', '#728cd7')
          .attr('text-anchor', 'middle')

      // creating a rectangle to capture the mouse position
      svg_graph
        .append('rect')
          .attr('class', 'overlay')
          .attr('width', width_graph)
          .attr('height', height_graph)
          .style('fill', 'none')
          .style('pointer-events', 'all')
          .on('mouseover', () => focus.style('display', null))
          .on('mouseout', () => focus.style('display', 'none'))
          .on('touchmove mousemove', mousemove_graph);

      // defining the mousemove function on graph
      function mousemove_graph(event){
        // defining some variables to access data to show after
        const bisect = d3.bisector((d) => d.annee).left 
        let x0 =x.invert(d3.pointer(event, this)[0]),
        i = bisect(dataFilter, x0, 1),
        d0 = dataFilter[i -1], 
        d1 = dataFilter[i],
        d = x0 - d0.annee > d1.annee - x0 ? d1 : d0 
        // we define the x and y position of the circle
        focus.select('circle.y')
          .attr("transform", "translate(" + x(d.annee) + "," + y(d.femmes/d.total*100) + ")");

        // define the position of x line that joins the x axis 
        focus
          .select(".x")
            .attr("transform", "translate(" + x(d.annee) + "," + y(d.femmes/d.total*100) + ")")
            .attr("y2", height_graph - y(d.femmes/d.total*100));

        // add text for the percentage
        focus
          .select('.text-value')
            .text( f(d.femmes/d.total*100) + "%")
            .attr("transform", "translate(" + x(d.annee) + "," + y((d.femmes/d.total*100) + 5) + ")");

        // add text for the year
        focus
          .select('.text-year')
            .text( d.annee)
            .attr('x', x(d.annee))
            .attr('y', height_graph + 19) // + 18 defined manually so text appears above axis ticks 
            
      };

      // function building the line
      function transition(path){
        path.transition()
          .duration(5000)
          .attrTween('stroke-dasharray', tweenDash)
      };
      // define function tweenDash used in the transition 
      function tweenDash() {
        const l = this.getTotalLength(),
            i = d3.interpolateString("0," + l, l + "," + l);
        return function(t) { return i(t) };
      }; 

});
} 

// Constructing tooltip 
function addTooltip(){

    var tooltip = svg.append('g') // group for the whole tooltip
        .attr('id', 'tooltip')
        .style('display', 'none')

    tooltip.append('rect') // rectangle containing the infos
        .attr('width', 210).attr('height', 60).attr('rx', 5).attr('ry', 5) // width and height defined manually 
        .style('fill', 'white')
        .style('stroke', 'black').style('stroke-width', 0.5)
        .style('opacity', 0.9)
        .style('padding', '1em');
    
    tooltip.append('line') // the line inserted btwn the canton name and the score
        .attr('x1', 40).attr('y1', 25).attr('x2', 160).attr('y2', 25)
        .style('stroke', '#929292').style('stroke-width', 0.5)
        .attr('transform', 'translate(0,5)');

    var text = tooltip.append('text') // text that contains info
        .style('font-size', '13px') // default text size
        .attr('transform', 'translate(0,20)');

    text.append('tspan') // canton updated by its id
        .attr('x', 105).attr('y', 0)
        .attr('id', 'tooltip-canton')
        .attr('text-anchor', 'middle')
        .style('font-size', '16px');

    text.append('tspan') // fixed text before percentage value
        .attr('x', 105).attr('y', 30)
        .attr('text-anchor', 'middle')
        .text("Femmes au Parlement : ")
        
    
    text.append('tspan') // text that changes according to % value
        .attr('id', 'tooltip-score')
        .style('font-weight', 'bold')
    
    return tooltip;
    }; // end tooltip function

// constructing title 
function addTitle(selected_year){
        // Construction titre 
        svg.append("text")
            .attr('x', (width / 2))
            .attr('y', 0 + margin.top)
            .attr('text-anchor', 'middle')
            .style('font-weight', '550')
            .style('font-size', '16px')
            .text(selected_year + " - Pourcentage de femmes dans les parlements cantonaux suisses")
            .classed('main-title', true);
    }; // end of title
