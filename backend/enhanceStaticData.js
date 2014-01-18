//this script enhances the adresses provided by JCdecaux static API, using OSM's Nominatim

console.log("****** starting");


fs = require('fs'), http = require("http");

var nbRegexp = /^(face |face au )?\d+/i;
var stationsToLoad, velibData, enhancedData;


fs.readFile('../www/velib.json', 'utf8', function (err,data)
{
	velibData = JSON.parse(data);
	enhancedData = [];

	stationsToLoad = velibData.length - 1;

	loadStation();

	


});


function loadStation()
{
	var i = stationsToLoad;

	console.log("------------------------");
	console.log(stationsToLoad);
	console.log(velibData[i].address);

	var station = {lat: velibData[i].latitude, lon: velibData[i].longitude, id: velibData[i].number, name: velibData[i].name };

	station.rawAddress = velibData[i].address;


	enhancedData.push(station);


	var options = {
		host: 'nominatim.openstreetmap.org',
		path: '/reverse?format=json&accept-language=fr-FR&addressdetails=1&zoom=18&lat='+station.lat+'&lon='+station.lon,
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	};

	// console.log("start request");

	var req = http.request(options, function(res)
	{
		console.log('STATUS: ' + res.statusCode);
		var output = '';
		res.setEncoding('utf8');
		res.on('data', function (chunk)
		{
			output += chunk;
		});


		res.on('end', function()
		{
			
			var osmData = JSON.parse(output);
			console.log(osmData.display_name);


			station.display_name = osmData.display_name;
			station.road = osmData.address.road;
			station.district = osmData.address.city_district;
			station.postcode = osmData.address.postcode;
			station.city = osmData.address.city;


			if (stationsToLoad === 0)
			// if (stationsToLoad === velibData.length - 5)
			{
				complete();
			}
			else
			{
				stationsToLoad--;
				loadStation();
			}


		});
	});

	req.on('error', function(e) {
		console.log('problem with request: ' + e.message);
	});


	req.end();

	
}

function complete()
{
	fs.writeFile('../www/velibEnhanced.json',  JSON.stringify(enhancedData), function(err)
	{
		console.log("****** done.");
	});
}