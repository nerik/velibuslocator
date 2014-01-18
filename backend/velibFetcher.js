//This script grabs Velib data from JDecaux services, write it in a more compact json file, and uploads it to a ftp

console.log("****** starting");

var https = require("https")
	, os = require("os")
    , qs = require("querystring")
    , fs = require('fs')
    , JSFtp = require("jsftp")
    , credentials = require("./credentials.js");



var options = {
    host: 'api.jcdecaux.com',
    port: 443,
    path: '/vls/v1/stations/?contract=Paris&apiKey=' + credentials.jcdecaux.apiKey,
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};

var req = https.request(options, function(res)
{
    var output = '';
    //console.log(options.host + ':' + res.statusCode);
    res.setEncoding('utf8');

    res.on('data', function (chunk) {
        output += chunk;
    });

    res.on('end', function() {

    	console.log("*** jcdecaux data received.");


    	var stationsData = parseStationsData(output);  

    	var stationsStr = JSON.stringify(stationsData);
        
    	//console.log(stationsStr);


		fs.writeFile("/tmp/stations.json", stationsStr, function(err) {
		
		if(err) {
		    console.log("!!! " + err);
		} else {
		    console.log("*** tmp stations file written");

			var ftp = new JSFtp(credentials.ftp);


		    ftp.auth(ftp.user, ftp.pass, function onConn(err)
		    {
		    	console.log("*** ftp conn made");
		    	if (err !== null) console.log("!!! "+err);

		    	ftp.put("/tmp/stations.json", 'www/nerik.me/velibFetcher/stations.json', function(hadError) 
		    	{

					if (!hadError)
					    console.log("*** File transferred successfully!");

					else
					{
						console.log("!!! ftp error");
					}

					ftp.raw.quit(function(err, data) 
					{
					    if (err) return console.error(err);

					    console.log("*** ftp closed.");
					    return;
					});

				});
		    });

		}
		}); 
    });
});

req.on('error', function(err) {
    console.log('!!! jcdecaux error: ' + err.message);
});

req.end();




var parseStationsData = function(output)
{
	var rawData = JSON.parse(output);
	var stations = [];

	for (var i = 0; i < rawData.length; i++) 
	{
		var rawStation = rawData[i];

		var station = { id: rawStation.number, 
						t: rawStation.bike_stands,
						b: rawStation.available_bikes,
						e: rawStation.available_bike_stands }

		stations.push( station );
	};

	var data = { timestamp: Date.now().toString(), from: os.hostname(), stations: stations };

	console.log("*** stations data parsed. Num stations : " + stations.length);

	return data;
}


