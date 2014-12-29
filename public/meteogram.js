;(function(){
    function Meteogram(xml, container) {
        this.symbols = [];
        this.symbolNames = [];
        this.precipitations = [];
        this.windDirections = [];
        this.windDirectionNames = [];
        this.windSpeeds = [];
        this.windSpeedNames = [];
        this.temperatures = [];
        this.pressures = [];
        this.xml = xml;
        this.container = container;
        this.parseYrData();
    }
    /**
     * Return weather symbol sprites as laid out at http://om.yr.no/forklaring/symbol/
     */
    Meteogram.prototype.getSymbolSize = function (period, weather) {
        //no rain = 1d or 1n, rain = 41d, 10 41n, thunderstorm = 25d 11 25n
        switch (weather) {
        case "no rain":
            return period == "night" ? "01n" : "01d";
        case "rain":
            return "10";
        case "thunderstorms":
            return "22"
        case "showers":
            return period == "night" ? "05n" : "05d";
        case "cloudy":
            return "04"
        }
    }
    Meteogram.prototype.getSymbolSprites = function (symbolSize) {
        return {
            '01d': {
                x: 0,
                y: 0
            },
            '01n': {
                x: symbolSize,
                y: 0
            },
            '16': {
                x: 2 * symbolSize,
                y: 0
            },
            '02d': {
                x: 0,
                y: symbolSize
            },
            '02n': {
                x: symbolSize,
                y: symbolSize
            },
            '03d': {
                x: 0,
                y: 2 * symbolSize
            },
            '03n': {
                x: symbolSize,
                y: 2 * symbolSize
            },
            '17': {
                x: 2 * symbolSize,
                y: 2 * symbolSize
            },
            '04': {
                x: 0,
                y: 3 * symbolSize
            },
            '05d': {
                x: 0,
                y: 4 * symbolSize
            },
            '05n': {
                x: symbolSize,
                y: 4 * symbolSize
            },
            '18': {
                x: 2 * symbolSize,
                y: 4 * symbolSize
            },
            '06d': {
                x: 0,
                y: 5 * symbolSize
            },
            '06n': {
                x: symbolSize,
                y: 5 * symbolSize
            },
            '07d': {
                x: 0,
                y: 6 * symbolSize
            },
            '07n': {
                x: symbolSize,
                y: 6 * symbolSize
            },
            '08d': {
                x: 0,
                y: 7 * symbolSize
            },
            '08n': {
                x: symbolSize,
                y: 7 * symbolSize
            },
            '19': {
                x: 2 * symbolSize,
                y: 7 * symbolSize
            },
            '09': {
                x: 0,
                y: 8 * symbolSize
            },
            '10': {
                x: 0,
                y: 9 * symbolSize
            },
            '11': {
                x: 0,
                y: 10 * symbolSize
            },
            '12': {
                x: 0,
                y: 11 * symbolSize
            },
            '13': {
                x: 0,
                y: 12 * symbolSize
            },
            '14': {
                x: 0,
                y: 13 * symbolSize
            },
            '15': {
                x: 0,
                y: 14 * symbolSize
            },
            '20d': {
                x: 0,
                y: 15 * symbolSize
            },
            '20n': {
                x: symbolSize,
                y: 15 * symbolSize
            },
            '20m': {
                x: 2 * symbolSize,
                y: 15 * symbolSize
            },
            '21d': {
                x: 0,
                y: 16 * symbolSize
            },
            '21n': {
                x: symbolSize,
                y: 16 * symbolSize
            },
            '21m': {
                x: 2 * symbolSize,
                y: 16 * symbolSize
            },
            '22': {
                x: 0,
                y: 17 * symbolSize
            },
            '23': {
                x: 0,
                y: 18 * symbolSize
            }
        };
    };


    /**
 * Function to smooth the temperature line. The original data provides only whole degrees,
 * which makes the line graph look jagged. So we apply a running mean on it, but preserve
 * the unaltered value in the tooltip.
 */
    Meteogram.prototype.smoothLine = function (data) {
        var i = data.length,
            sum,
            value;

        while (i--) {
            data[i].value = value = data[i].y; // preserve value for tooltip

            // Set the smoothed value to the average of the closest points, but don't allow
            // it to differ more than 0.5 degrees from the given value
            sum = (data[i - 1] || data[i]).y + value + (data[i + 1] || data[i]).y;
            data[i].y = Math.max(value - 0.5, Math.min(sum / 3, value + 0.5));
        }
    };

    /**
 * Callback function that is called from Highcharts on hovering each point and returns
 * HTML for the tooltip.
 */
    Meteogram.prototype.tooltipFormatter = function (tooltip) {

        // Create the header with reference to the time interval
        var index = tooltip.points[0].point.index,
            ret = '<small>' + Highcharts.dateFormat('%A, %b %e, %H:%M', tooltip.x) + '-' +
                Highcharts.dateFormat('%H:%M', tooltip.points[0].point.to) + '</small><br>';

        // Symbol text
        ret += '<b>' + this.symbolNames[index] + '</b>';

        ret += '<table>';

        // Add all series
        Highcharts.each(tooltip.points, function (point) {
            var series = point.series;
            ret += '<tr><td><span style="color:' + series.color + '">\u25CF</span> ' + series.name +
                ': </td><td style="white-space:nowrap">' + Highcharts.pick(point.point.value, point.y) +
                series.options.tooltip.valueSuffix + '</td></tr>';
        });

        // Add wind
        ret += '<tr><td style="vertical-align: top">\u25CF Wind</td><td style="white-space:nowrap">' + this.windDirectionNames[index] +
            '<br>' + this.windSpeedNames[index] + ' (' +
            Highcharts.numberFormat(this.windSpeeds[index], 1) + ' m/s)</td></tr>';

        // Close
        ret += '</table>';


        return ret;
    };

    /**
 * Draw the weather symbols on top of the temperature series. The symbols are sprites of a single
 * file, defined in the getSymbolSprites function above.
 */
    Meteogram.prototype.drawWeatherSymbols = function (chart) {
        var meteogram = this,
            symbolSprites = this.getSymbolSprites(30);

        $.each(chart.series[0].data, function (i, point) {
            var sprite,
                group;

            //if (meteogram.resolution > 36e5 || i % 2 === 0) {

            sprite = symbolSprites[meteogram.symbols[i]];
            if (sprite) {

                // Create a group element that is positioned and clipped at 30 pixels width and height
                group = chart.renderer.g()
                    .attr({
                        translateX: point.plotX + chart.plotLeft - 15,
                        translateY: point.plotY + chart.plotTop - 30,
                        zIndex: 5
                    })
                    .clip(chart.renderer.clipRect(0, 0, 30, 30))
                    .add();

                // Position the image inside it at the sprite position
                chart.renderer.image(
                    'meteogram-symbols.png',
                    -sprite.x,
                    -sprite.y,
                    90,
                    570
                )
                    .add(group);
            }
            //}
        });
    };

    /**
     * Get the title based on the XML data
     */
    Meteogram.prototype.getTitle = function () {
        return 'Meteogram for ' + capitalize(this.container);
    };

    /**
     * Build and return the Highcharts options structure
     */
    Meteogram.prototype.getChartOptions = function () {
        var meteogram = this;

        return {
            chart: {
                renderTo: this.container,
                marginBottom: 70,
                marginRight: 40,
                marginTop: 50,
                plotBorderWidth: 1,
                width: 800,
                height: 310
            },

            title: {
                text: this.getTitle(),
                align: 'left'
            },

            credits: {
                text: 'Forecast from <a href="http://www.met.gov.my/">Portal Rasmi Jabatan Meteorologi Malaysia</a>',
                href: 'http://www.met.gov.my/',
                position: {
                    x: -30,
                    y: -30
                }
            },

            /*tooltip: {
            shared: true,
            useHTML: true,
            formatter: function () {
                return meteogram.tooltipFormatter(this);
            }
        },*/

            xAxis: [{ // Bottom X axis
                    type: 'datetime',
                    tickInterval: 4 * 36e5, // four hours
                    minorTickInterval: 2 * 36e5, // two hour
                    tickLength: 0,
                    gridLineWidth: 1,
                    gridLineColor: (Highcharts.theme && Highcharts.theme.background2) || '#F0F0F0',
                    startOnTick: false,
                    endOnTick: false,
                    minPadding: 0,
                    maxPadding: 0,
                    //offset: 30,
                    showLastLabel: false,
                    labels: {
                        // enabled:false // default is true
                        format: '{value:%H}'
                    }
                }, { // Top X axis
                    linkedTo: 0,
                    type: 'datetime',
                    tickInterval: 24 * 3600 * 1000,
                    labels: {
                        format: '{value:<span style="font-size: 12px; font-weight: bold">%a</span> %b %e}',
                        align: 'left',
                        x: 3,
                        y: -5
                    },
                    opposite: true,
                    tickLength: 20,
                    gridLineWidth: 1
                }],

            yAxis: [{ // temperature axis
                    title: {
                        text: null
                    },
                    labels: {
                        format: '{value}°',
                        style: {
                            fontSize: '10px'
                        },
                        x: -3
                    },
                    plotLines: [{ // zero plane
                        value: 0,
                        color: '#BBBBBB',
                        width: 1,
                        zIndex: 2
                    }],
                    // Custom positioner to provide even temperature ticks from top down
                    tickPositioner: function () {
                        var max = Math.ceil(this.max) + 1,
                            pos = max - 12, // start
                            ret;

                        if (pos < this.min) {
                            ret = [];
                            while (pos <= max) {
                                ret.push(pos += 1);
                            }
                        } // else return undefined and go auto

                        return ret;

                    },
                    maxPadding: 0.3,
                    tickInterval: 1,
                    gridLineColor: (Highcharts.theme && Highcharts.theme.background2) || '#F0F0F0'

                }, { // precipitation axis
                    title: {
                        text: null
                    },
                    labels: {
                        enabled: false
                    },
                    gridLineWidth: 0,
                    tickLength: 0

                }, { // Air pressure
                    allowDecimals: false,
                    title: { // Title on top of axis
                        text: '°C',
                        offset: 0,
                        align: 'high',
                        rotation: 0,
                        style: {
                            fontSize: '10px',
                            color: Highcharts.getOptions().colors[2]
                        },
                        textAlign: 'left',
                        x: 3
                    },
                    labels: {
                        style: {
                            fontSize: '8px',
                            color: Highcharts.getOptions().colors[2]
                        },
                        y: 2,
                        x: 3
                    },
                    gridLineWidth: 0,
                    opposite: true,
                    showLastLabel: false
                }],

            legend: {
                enabled: false
            },

            plotOptions: {
                series: {
                    pointPlacement: 'between'
                }
            },


            series: [{
                    name: 'Temperature',
                    data: this.temperatures,
                    type: 'spline',
                    marker: {
                        enabled: false,
                        states: {
                            hover: {
                                enabled: true
                            }
                        }
                    },
                    tooltip: {
                        valueSuffix: '°C'
                    },
                    zIndex: 1,
                    color: '#FF3333',
                    negativeColor: '#48AFE8'
                }, {
                    name: 'Precipitation',
                    data: this.precipitations,
                    type: 'column',
                    color: '#68CFE8',
                    yAxis: 1,
                    groupPadding: 0,
                    pointPadding: 0,
                    borderWidth: 0,
                    shadow: false,
                    dataLabels: {
                        enabled: true,
                        formatter: function () {
                            if (this.y > 0) {
                                return this.y;
                            }
                        },
                        style: {
                            fontSize: '8px'
                        }
                    },
                    tooltip: {
                        valueSuffix: 'mm'
                    }
                }, {
                    name: 'Air pressure',
                    color: Highcharts.getOptions().colors[2],
                    data: this.pressures,
                    marker: {
                        enabled: false
                    },
                    shadow: false,
                    tooltip: {
                        valueSuffix: ' hPa'
                    },
                    dashStyle: 'shortdot',
                    yAxis: 2
                }]
        }
    };

    /**
     * Post-process the chart from the callback function, the second argument to Highcharts.Chart.
     */
    Meteogram.prototype.onChartLoad = function (chart) {

        this.drawWeatherSymbols(chart);
        //this.drawWindArrows(chart);
        //this.drawBlocksForWindArrows(chart);

    };

    /**
     * Create the chart. This function is called async when the data file is loaded and parsed.
     */
    Meteogram.prototype.createChart = function () {
        var meteogram = this;
        this.chart = new Highcharts.Chart(this.getChartOptions(), function (chart) {
            meteogram.onChartLoad(chart);
        });
    };

    /**
     * Handle the data. This part of the code is not Highcharts specific, but deals with yr.no's
     * specific data format
     */
    Meteogram.prototype.parseYrData = function () {

        var meteogram = this,
            xml = this.xml,
            pointStart;

        if (!xml || !xml.results) {
            $('#loading').html('Failed loading data, please try again later');
            return;
        }

        // The returned xml variable is a JavaScript representation of the provided XML,
        // generated on the server by running PHP simple_load_xml and converting it to
        // JavaScript by json_encode.
        $.each(xml.results, function (i, result) {
            //symbol : no rain = 1d or 1n, rain = 41d, 10 41n, thunderstorm = 25d 11 25n
            if (result.date) {
                var date = result.date;
                var max_temp = result.max_temp;
                var min_temp = result.min_temp;
                var morning = result.morning;
                var afternoon = result.afternoon;
                var night = result.night;
                var summay_forecaset = result.summay_forecaset;
                // morning
                var from = Date.parse(date + " " + "06:00:00 UTC");
                var to = Date.parse(date + " " + "13:30:00 UTC");
                meteogram.symbols.push(meteogram.getSymbolSize('morning', morning.toLowerCase()));
                meteogram.symbolNames.push(morning);

                meteogram.temperatures.push({
                    x: from,
                    y: parseInt(min_temp),
                    // custom options used in the tooltip formatter
                    to: to,
                    index: i
                });
                // afternon
                from = to;
                to = Date.parse(date + " " + "18:30:00 UTC");
                meteogram.symbols.push(meteogram.getSymbolSize('afternoon', afternoon.toLowerCase()));
                meteogram.symbolNames.push(afternoon);

                meteogram.temperatures.push({
                    x: from,
                    y: parseInt(max_temp),
                    to: to,
                    index: i + 1
                });

                //night
                from = to;
                to = Date.parse(date + " " + "23:30:00 UTC");
                meteogram.symbols.push(meteogram.getSymbolSize('night', night.toLowerCase()));
                meteogram.symbolNames.push(night);

                meteogram.temperatures.push({
                    x: from,
                    y: parseInt(Math.floor(min_temp + ((max_temp - min_temp) / 2))),
                    to: to,
                    index: i + 2
                });
            }


            if (to > pointStart + 4 * 24 * 36e5) {
                return;
            }

            // If it is more than an hour between points, show all symbols
            if (i === 0) {
                meteogram.resolution = to - from;
            }


            if (i == 0) {
                pointStart = (from + to) / 2;
            }
        });

        // Smooth the line
        this.smoothLine(this.temperatures);

        // Create the chart when the data is loaded
        this.createChart();
    };

    /**
     * Create wind speed symbols for the Beaufort wind scale. The symbols are rotated
     * around the zero centerpoint.
     */
    Meteogram.prototype.windArrow = function (name) {
        var level,
            path;

        // The stem and the arrow head
        path = [
            'M', 0, 7, // base of arrow
            'L', -1.5, 7,
            0, 10,
            1.5, 7,
            0, 7,
            0, -10 // top
        ];

        level = $.inArray(name, ['Calm', 'Light air', 'Light breeze', 'Gentle breeze', 'Moderate breeze',
            'Fresh breeze', 'Strong breeze', 'Near gale', 'Gale', 'Strong gale', 'Storm',
            'Violent storm', 'Hurricane']);

        if (level === 0) {
            path = [];
        }

        if (level === 2) {
            path.push('M', 0, -8, 'L', 4, -8); // short line
        } else if (level >= 3) {
            path.push(0, -10, 7, -10); // long line
        }

        if (level === 4) {
            path.push('M', 0, -7, 'L', 4, -7);
        } else if (level >= 5) {
            path.push('M', 0, -7, 'L', 7, -7);
        }

        if (level === 5) {
            path.push('M', 0, -4, 'L', 4, -4);
        } else if (level >= 6) {
            path.push('M', 0, -4, 'L', 7, -4);
        }

        if (level === 7) {
            path.push('M', 0, -1, 'L', 4, -1);
        } else if (level >= 8) {
            path.push('M', 0, -1, 'L', 7, -1);
        }

        return path;
    };

    /**
     * Draw the wind arrows. Each arrow path is generated by the windArrow function above.
     */
    Meteogram.prototype.drawWindArrows = function (chart) {
        var meteogram = this;

        $.each(chart.series[0].data, function (i, point) {
            var sprite, arrow, x, y;

            if (meteogram.resolution > 36e5 || i % 2 === 0) {

                // Draw the wind arrows
                x = point.plotX + chart.plotLeft + 7;
                y = 255;
                if (meteogram.windSpeedNames[i] === 'Calm') {
                    arrow = chart.renderer.circle(x, y, 10).attr({
                        fill: 'none'
                    });
                } else {
                    arrow = chart.renderer.path(
                        meteogram.windArrow(meteogram.windSpeedNames[i])
                    ).attr({
                        rotation: parseInt(meteogram.windDirections[i], 10),
                        translateX: x, // rotation center
                        translateY: y // rotation center
                    });
                }
                arrow.attr({
                    stroke: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black',
                    'stroke-width': 1.5,
                    zIndex: 5
                })
                    .add();

            }
        });
    };

    /**
     * Draw blocks around wind arrows, below the plot area
     */
    Meteogram.prototype.drawBlocksForWindArrows = function (chart) {
        var xAxis = chart.xAxis[0],
            x,
            pos,
            max,
            isLong,
            isLast,
            i;

        for (pos = xAxis.min, max = xAxis.max, i = 0; pos <= max + 36e5; pos += 36e5, i += 1) {

            // Get the X position
            isLast = pos === max + 36e5;
            x = Math.round(xAxis.toPixels(pos)) + (isLast ? 0.5 : -0.5);

            // Draw the vertical dividers and ticks
            if (this.resolution > 36e5) {
                isLong = pos % this.resolution === 0;
            } else {
                isLong = i % 2 === 0;
            }
            chart.renderer.path(['M', x, chart.plotTop + chart.plotHeight + (isLong ? 0 : 28),
                'L', x, chart.plotTop + chart.plotHeight + 32, 'Z'])
                .attr({
                    'stroke': chart.options.chart.plotBorderColor,
                    'stroke-width': 1
                })
                .add();
        }
    };    

    function capitalize(val){
        return val.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }

    window.Meteogram = Meteogram;
}).call(this);
