/**
 * Created by drichards on 4/28/17.
 */


// Variables
var width = 500;
var height = 500;
var radius = Math.min(width, height) / 2;
var color = d3.scaleOrdinal(d3.schemeCategory20b);


// Size our <svg> element, add a <g> element, and move translate 0,0 to the center of the element.
var g = d3.select('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

// Create our sunburst data structure and size it.
var partition = d3.partition()
    .size([2 * Math.PI, radius]);

// Get the data from our JSON file
d3.json("data.json", function(error, nodeData) {
    if (error) throw error;

    allNodes = nodeData;
    var showNodes = JSON.parse(JSON.stringify(nodeData));
    drawSunburst(allNodes, true);
});

function drawSunburst(data, firstRun) {

    // Find the root node, calculate the node.value, and sort our nodes by node.value
    root = d3.hierarchy(data)
        .sum(function (d) { return d.size; })
        .sort(function (a, b) { return b.value - a.value; });

    // Calculate the size of each arc; save the initial angles for tweening.
    partition(root);
    arc = d3.arc()
        .startAngle(function (d) { d.x0s = d.x0; return d.x0; })
        .endAngle(function (d) { d.x1s = d.x1; return d.x1; })
        .innerRadius(function (d) { return d.y0; })
        .outerRadius(function (d) { return d.y1; });

    // Add a <g> element for each node; create the slice variable since we'll refer to this selection many times
    slice = g.selectAll('g.node').data(root.descendants(), function(d) { return d.data.name; }); // .enter().append('g').attr("class", "node");
    newSlice = slice.enter().append('g').attr("class", "node").merge(slice);
    slice.exit().remove();

    // TRY 1: ID selection that's has been drawn previously... (requires us to set "drawn" down below)
    // newSlice.filter( function(d) { return !d.drawn; }).append('path')
    //    .attr("display", function (d) { return d.depth ? null : "none"; }).style('stroke', '#fff');

    // TRY 2: Only create paths on "first run"
    if (firstRun) {
        // slice.selectAll('path').remove();
        newSlice.append('path').attr("display", function (d) { return d.depth ? null : "none"; })
            //.transition().duration(750).attrTween("d", arcTweenPath)
            .attr("d", arc)
            .style('stroke', '#fff')
            .style("fill", function (d) { return color((d.children ? d : d.parent).data.name); });

        // newSlice.append('path').attr("display", function (d) { return d.depth ? null : "none"; }).style('stroke', '#fff');
    }

    // TRY 1&2: Set path-d and color always. But this isn't using new arc...?
    newSlice.selectAll('path').attr("d", arc).style("fill", function (d) { return color((d.children ? d : d.parent).data.name); });



    // Append <path> elements and draw lines based on the arc calculations. Last, color the lines and the slices.
    // slice.selectAll('path').remove();
    // newSlice.append('path').attr("display", function (d) { return d.depth ? null : "none"; })
    //     .transition().duration(750).attrTween("d", arcTweenPath)
    //     //.attr("d", arc)
    //     .style('stroke', '#fff')
    //     .style("fill", function (d) { return color((d.children ? d : d.parent).data.name); });

    // Populate the <text> elements with our data-driven titles.
    slice.selectAll('text').remove();
    newSlice.append("text")
        .attr("transform", function(d) {
            return "translate(" + arc.centroid(d) + ")rotate(" + computeTextRotation(d) + ")"; })
        .attr("dx", "-20")
        .attr("dy", ".5em")
        .text(function(d) { return d.parent ? d.data.name : "" });

    newSlice.on("click", highlightSelectedSlice);
};

d3.selectAll(".showSelect").on("click", showTopTopics);
d3.selectAll(".sizeSelect").on("click", sliceSizer);

// Redraw the Sunburst Based on User Input
function highlightSelectedSlice(c,i) {

    clicked = c;
    var rootPath = clicked.path(root).reverse();
    rootPath.shift(); // remove root node from the array

    newSlice.style("opacity", 0.4);
    newSlice.filter(function(d) {
        if (d === clicked && d.prevClicked) {
            d.prevClicked = false;
            newSlice.style("opacity", 1);
            return true;

        } else if (d === clicked) {
            d.prevClicked = true;
            return true;
        } else {
            d.prevClicked = false;
            return (rootPath.indexOf(d) >= 0);
        }
    })
        .style("opacity", 1);

    //d3.select("#sidebar").text("another!");

};

// Redraw the Sunburst Based on User Input
function sliceSizer(r, i) {

    // Determine how to size the slices.
    if (this.value === "size") {
        root.sum(function (d) { return d.size; });
    } else {
        root.sum(function (d) {
            d.size = (d.top <= 10) ? d.size : 0;
            return d.size; });
        //root.count();
    }
    root.sort(function(a, b) { return b.value - a.value; });

    partition(root);

    newSlice.selectAll("path").transition().duration(750).attrTween("d", arcTweenPath);
    newSlice.selectAll("text").transition().duration(750).attrTween("transform", arcTweenText);
};

// Redraw the Sunburst Based on User Input
function showTopTopics(r, i) {
    //alert(this.value);
    var showCount;

    // Determine how to size the slices.
    if (this.value === "top5") {
        showCount = 1;
    } else if (this.value === "top10") {
        showCount = 2;
    } else {
        showCount = 100;
    }

    var showNodes = JSON.parse(JSON.stringify(allNodes));
    showNodes.children.splice(showCount, (showNodes.children.length - showCount));

    drawSunburst(showNodes, true);

};

/**
 * When switching data: interpolate the arcs in data space.
 * @param {Node} a
 * @param {Number} i
 * @return {Number}
 */
function arcTweenPath(a, i) {

    var oi = d3.interpolate({ x0: a.x0s, x1: a.x1s }, a);

    function tween(t) {
        var b = oi(t);
        a.x0s = b.x0;
        a.x1s = b.x1;
        return arc(b);
    }

    return tween;
}

function arcTweenPathFull(a, i) {

    var oi = d3.interpolate({ x0: (a.x0f ? a.x0f : 0), x1: (a.x1f ? a.x1f : 0), y0: (a.y0f ? a.y0f : 0), y1: (a.y1f ? a.y1f : 0) }, a);

    function tween(t) {
        var b = oi(t);
        a.x0f = b.x0;
        a.x1f = b.x1;
        a.y0f = b.y0;
        a.y1f = b.y1;
        return arc(b);
    }

    return tween;
}

/**
 * When switching data: interpolate the text centroids and rotation.
 * @param {Node} a
 * @param {Number} i
 * @return {Number}
 */
function arcTweenText(a, i) {

    var oi = d3.interpolate({ x0: a.x0s, x1: a.x1s }, a);
    function tween(t) {
        var b = oi(t);
        return "translate(" + arc.centroid(b) + ")rotate(" + computeTextRotation(b) + ")";
    }
    return tween;
}

/**
 * Calculate the correct distance to rotate each label based on its location in the sunburst.
 * @param {Node} d
 * @return {Number}
 */
function computeTextRotation(d) {
    var angle = (d.x0 + d.x1) / Math.PI * 90;

    // Avoid upside-down labels
    return (angle < 120 || angle > 270) ? angle : angle + 180;  // labels as rims
    //return (angle < 180) ? angle - 90 : angle + 90;  // labels as spokes
    }