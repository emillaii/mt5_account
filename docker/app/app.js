
let apiUrl = 'http://192.168.1.50:3000'; // Base URL for API calls

var chartInstances = {}; // Object to hold chart instances

    var chartOptions = {
    scales: {
        x: {
            grid: {
                color: 'rgba(255, 255, 255, 0.1)' // Lighter grid lines
            },
            ticks: {
                color: '#ffffff' // Bright text for x-axis ticks
            }
        },
        y: {
            grid: {
                color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
                color: '#ffffff' // Bright text for y-axis ticks
            }
        }
    },
    plugins: {
        legend: {
            labels: {
                color: '#ffffff' // Bright text for legend labels
            }
        }
    }
};

function getRandomColor() {
    // Define ranges for hues that exclude light green (approximately 90° to 150°)
    var hueRanges = [
        { min: 0, max: 89 }, // Before light green
        { min: 151, max: 360 } // After light green
    ];

    // Randomly select one of the hue ranges
    var selectedRange = hueRanges[Math.floor(Math.random() * hueRanges.length)];

    // Generate a random hue within the selected range
    var hue = Math.floor(Math.random() * (selectedRange.max - selectedRange.min + 1)) + selectedRange.min;

    // Saturation is set to 100% for the brightest colors
    var saturation = "100%";

    // Lightness is set between 40% and 60% to avoid extreme whites and darks
    var lightness = (40 + Math.random() * 20) + "%";

    return "hsl(" + hue + ", " + saturation + ", " + lightness + ")";
}

function createMergedSeries(accountData, dealsData) {
    // Convert dealsData timestamps to a map for quick lookup
    let dealsMap = new Map(dealsData.map(deal => [deal.time * 1000 - 2 * 60 *60 *1000, deal.profit])); // Convert to milliseconds

    // Define a threshold for "nearest time" in milliseconds
    let threshold = 10 * 1000; // 10 secs in milliseconds

    // Prepare merged dataset
    let mergedData = accountData.map(accountItem => {
        // Convert accountItem.timestamp to Date object for comparison
        let accountItemTime = new Date(accountItem.timestamp).getTime();

        // Initialize variables to track the nearest deal
        let nearestDealProfit = 0; // Default profit if no deal is found
        let smallestTimeDiff = Infinity; // Track the smallest time difference

        for (let [dealTime, dealProfit] of dealsMap.entries()) {
            // Calculate time difference between the deal and account item
            let timeDiff = Math.abs(dealTime - accountItemTime);
            // If the time difference is within the threshold and smaller than any previous difference
            if (timeDiff <= threshold && timeDiff < smallestTimeDiff) {
                nearestDealProfit = dealProfit;
                smallestTimeDiff = timeDiff; // Update smallest difference found
            }
        }

        // Return the modified account item with the nearest deal's profit (or 0)
        return {
            ...accountItem,
            profit: nearestDealProfit
        };
    });

    return mergedData;
}

// Function to update a chart's data or create a new chart
function updateOrCreateChart(accountName, accountData, dealsData) {

    let mergedSeries = createMergedSeries(accountData, dealsData);

    let profitDataset = {
        label: accountName + ' Profit',
        data: accountData.map(data => ({
            x: new Date(data.timestamp),
            y: data.profit
        })),
        borderColor: getRandomColor(),
        backgroundColor: 'transparent',
        pointRadius: 2
    }

    let dealsDataset = {
        label: accountName + ' Deals',
        data: mergedSeries.map(data => ({
            x: new Date(data.timestamp),
            y: data.profit
        })),
        borderColor: 'rgba(144, 238, 144, 0.5', // Set line color to white
        backgroundColor: 'rgba(144, 238, 144, 0.2)', // Adjust background color if needed, or remove
        borderDash: [1, 1], // Creates a dotted line pattern
        pointRadius: 0.01, // Optionally, keep the point radius small if you don't want to emphasize the points
        pointStyle: 'rectRot',
        pointBackgroundColor: 'rgba(144, 238, 144, 0.5)', // Ensure point color matches the line
        fill: false, // Typically set to false for line datasets unless you want a filled area chart
        showLine: true, // Ensure the line is shown
    };


    let containerId = 'chart-container-' + accountName;
    if (chartInstances[accountName]) {
        // Chart exists, update its data
        chartInstances[accountName].data.labels = accountData.map(data => new Date(data.timestamp).toLocaleTimeString()),

        chartInstances[accountName].data.datasets[0].data = mergedSeries.map(data => data.profit);
        chartInstances[accountName].data.datasets[1].data = accountData.map(data => data.profit);
        chartInstances[accountName].update();
    } else {
        // Chart does not exist, create a new one
        var container = document.createElement('div');
        container.className = 'chart-container-item';
        container.id = containerId;
        document.getElementById('charts').appendChild(container);

        // Create a canvas inside the container
        var ctx = document.createElement('canvas');
        ctx.style.height = '100%'
        container.appendChild(ctx);

        // Creating a div for total profit display
        var totalProfitDiv = document.createElement('div');
        totalProfitDiv.className = 'total-profit-display';
        container.appendChild(totalProfitDiv);

        chartInstances[accountName] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: accountData.map(data => new Date(data.timestamp).toLocaleTimeString()),
                datasets: [
                    dealsDataset,
                    profitDataset
                ]
            },
            options: chartOptions
        });
    }

    // Display latest total profit
    let totalProfitText = 'Total Profit: ' + accountData[accountData.length-1].profit;
    totalProfitDiv = document.getElementById(containerId).getElementsByClassName('total-profit-display')[0];
    totalProfitDiv.innerText = totalProfitText;

    if (accountData[accountData.length-1].profit < 0) {
        totalProfitDiv.style.color = 'red';
    } else {
        totalProfitDiv.style.color = 'green';
    }
}


function createPositionsTable(positionsData) {
    var container = document.getElementById('positionTableContainer');
    container.innerHTML = ''; // Clear previous content

    var accountSummaryArray = [];

    for (var account in positionsData) {
        // Initialize total profit for the account
        var totalProfit = 0;

        var header = document.createElement('h3');
        header.innerHTML = account;

        var accountSummary = document.createElement('h4'); // Smaller than h3 for subheading

        var table = document.createElement('table');
        table.className = 'positions-table'; // For CSS styling
        var thead = table.createTHead();
        var tbody = document.createElement('tbody');

        // Create table header
        var headerRow = thead.insertRow();
        var headers = ['Ticket', 'Time', 'Symbol', 'Volume', 'Open Price', 'Type', 'Profit'];
        headers.forEach(headerText => {
            var cell = headerRow.insertCell();
            cell.appendChild(document.createTextNode(headerText));
        });

        // Create table body
        positionsData[account].forEach(position => {
            var row = tbody.insertRow();
            for (var key in position) {
                var cell = row.insertCell();
                var text = document.createTextNode(position[key]);

                // Check if the cell is for 'profit' and apply color based on value
                if (key === 'profit') {
                    cell.className = position[key] < 0 ? 'profit-negative' : 'profit-positive';
                    // Add to total profit
                    totalProfit += position[key];
                } else if (key === 'time') {
                    var time = new Date(position[key]*1000).toLocaleString('en-HK', {
                        timeZone: 'Asia/Hong_Kong',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                    text = document.createTextNode(time);
                }

                cell.appendChild(text);
            }
        });

        accountSummaryArray.push('Total Profit for ' + account + ': ' + totalProfit.toFixed(2));

        // Set the total profit in the account summary
        accountSummary.innerHTML = 'Total Profit for ' + account + ': ' + totalProfit.toFixed(2);
        accountSummary.className = totalProfit < 0 ? 'profit-negative' : 'profit-positive';

        table.appendChild(tbody);
        container.appendChild(header);
        container.appendChild(accountSummary);
        container.appendChild(table);
    }
    accountSummaryArray.forEach(text => {
        var accountSummary = document.createElement('h4');
        accountSummary.innerHTML = text;
        container.appendChild(accountSummary);
    })

}


function fetchAndDisplayPositions() {
    fetch(apiUrl + '/getPosition?token=' + localStorage.getItem('token') + '&username=' + localStorage.getItem('username'))
        .then(response => response.json())
        .then(data => {
            createPositionsTable(data.data);
        })
        .catch(error => console.error('Error fetching position data:', error));
}

function fetchAndDisplayChart() {
    fetch(apiUrl + '/getData?token=' + localStorage.getItem('token') + '&username=' + localStorage.getItem('username'))
        .then(response => response.json())
        .then(data => {
            var accountData = data;
            fetch(apiUrl + '/getDeals?token=' + localStorage.getItem('token') + '&username=' + localStorage.getItem('username'))
                .then(response => response.json())
                .then(data => {
                    Object.keys(data.data).forEach(account => {
                        var dealsData = data.data[account];
                        updateOrCreateChart(account, accountData.data[account], dealsData);
                    });
                })
                .catch(error => console.error('Error fetching data:', error));
        })
        .catch(error => console.error('Error fetching data:', error));
}


function fetchData() {
    fetchAndDisplayPositions();
    fetchAndDisplayChart();
}
fetchData();
setInterval(fetchData, 10000); // Refresh every 10 seconds

document.getElementById('playSoundButton').addEventListener('click', function() {
    var alertSound = document.getElementById('profitAlertSound');
    alertSound.play();
});

document.addEventListener('DOMContentLoaded', function () {
    function updateLocalTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString(); // Adjust toLocaleTimeString options for different formats
        document.getElementById('localTimeDisplay').innerText = `** Time: ${timeString} **`;
    }

    // Update time display every second
    setInterval(updateLocalTime, 1000);

    // Optionally, handle the play sound button
    document.getElementById('playSoundButton').addEventListener('click', function () {
        var alertSound = document.getElementById('profitAlertSound');
        alertSound.play();
    });

    //tvView
    var symbols = [ // Initial set of symbols
        ["XAUUSD", "XAUUSD|1D"],
        ["GBPUSD", "GBPUSD|1D"],
        ["EURUSD", "EURUSD|1D"],
        ["EURNZD", "EURNZD|1D"],
    ];

    // Function to update the TradingView widget with new symbols
    function updateTradingViewWidget(newSymbols) {
        var tvViewDiv = document.getElementById('tvView');

        // Clear the content of the tvView div to remove the old widget
        while (tvViewDiv.firstChild) {
            tvViewDiv.removeChild(tvViewDiv.firstChild);
        }

        var widgetScript = document.getElementById('tradingViewWidgetScript');
        if (widgetScript) {
            // Remove the existing script to replace it
            widgetScript.remove();
        }

        var script = document.createElement('script');
        script.id = 'tradingViewWidgetScript';
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
        script.async = true;
        script.innerHTML = JSON.stringify({
            "symbols": newSymbols,
            "chartOnly": false,
            "width": "100%",
            "height": 500,
            "locale": "en",
            "colorTheme": "dark",
            "autosize": true,
            "showVolume": false,
            "hideDateRanges": false,
            "scalePosition": "right",
            "scaleMode": "Normal",
            "fontFamily": "Trebuchet MS, Roboto, Ubuntu, sans-serif",
            "noTimeScale": false,
            "valuesTracking": "1",
            "chartType": "area"
            // Add any additional configuration as needed
        });
        document.getElementById('tvView').appendChild(script);
    }

    // Initial widget setup
    updateTradingViewWidget(symbols);

    // Handle add symbol button click
    document.getElementById('addSymbolButton').addEventListener('click', function () {
        var symbolInput = document.getElementById('symbolInput').value;
        if (symbolInput) {
            var symbolParts = symbolInput.split('|');
            symbols.push([symbolParts[0], symbolInput]); // Add new symbol to array
            updateTradingViewWidget(symbols); // Update the widget with the new symbol list
            document.getElementById('symbolInput').value = ''; // Clear the input
        }
    });
});