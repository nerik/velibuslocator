var map;
var mapContainer;
var stationsData;
var isPhoneGap;
var markers;
var markersDic;
var geolocMarker;
var timestamp;

var adress, lastrefresh, availableBikes,  bikeStands, lastrefreshInfo;

var app =
{
    initialize: function()
    {
        mapContainer = document.getElementById("map");
        scaleMapToViewport();

        adress = document.getElementById('adress');
        lastrefresh = document.getElementById('lastrefresh');
        availableBikes = document.getElementById('availableBikes');
        bikeStands = document.getElementById('bikeStands');
        lastrefreshInfo = document.getElementById('lastrefresh-info');

        

        //map-------------
        map = L.map('map', {fadeAnimation: false} ).setView([48.86, 2.35], 15);
        //map = L.map('map').setView([38.9013,-77.036], 12);

        //var url = 'http://{s}.tile.cloudmade.com/35b903681aae42fb87897739e9a012b3/997/256/{z}/{x}/{y}.png';
        var url = 'img/tiles/{z}/{x}/{y}.png';

        L.tileLayer(url, {
            minZoom: 13,
            maxZoom: 17,
            maxBounds: L.latLngBounds(L.latLng(2.1959,48.7872), L.latLng(2.4891,48.9266)),
            reuseTiles: true,
            unloadInvisibleTiles: false,
            updateWhenIdle: false,
            detectRetina: true
        }).addTo(map);

        map.attributionControl.setPrefix('');
        map.on('moveend', onMapMoveEnd );

        setMapIcons();
       

        isPhoneGap = document.URL.indexOf( 'http://' ) === -1 && document.URL.indexOf( 'https://' ) === -1;

        if (isPhoneGap)         document.addEventListener('deviceready', this.onDeviceReady, false);
        else                    this.onDeviceReady();

        window.addEventListener("resize", this.onWindowResize, false);
        //window.addEventListener("orientationchange", this.onWindowResize, false);



        document.getElementById("geoloc").addEventListener("click", onGeolocClicked);
        document.getElementById("refresh").addEventListener("click", onStationsClicked);

        loadStaticVelibData(loadRealtimeVelibData);
        // load
        
    },

    onDeviceReady: function ()
    {
        scaleMapToViewport();
        
    },

    onWindowResize: function()
    {
        scaleMapToViewport();
    }
   
};


var iconClasses = [];
var iconStates = ["empty", "almostEmpty", "normal", "almostFull", "full", "loading"];

var setMapIcons = function()
{

    

    for (var i = 0; i < iconStates.length; i++)
    {
        var cl = L.Icon.Default.extend({
            options: {
                iconUrl: 'img/markers/'+ iconStates[i] + '_25.png',
                iconRetinaUrl: 'img/markers/'+ iconStates[i] + '_hd.png',
                 iconSize : [20,25],
            iconAnchor: [10, 25],
            shadowSize:[0,0],
            shadow: false,
            shadowUrl: undefined,
            shadowRetinaUrl: undefined
            }
         });

        iconClasses[i] = cl;
    }

   
};




var scaleMapToViewport = function()
{

    mapContainer.style.width = window.innerWidth + "px";
    mapContainer.style.height = window.innerHeight + "px";

    document.querySelector("#info").style.width = window.innerWidth - 240 + "px";
};

var onMapMoveEnd = function()
{
   
    loadMarkers();
};


var onGeolocClicked = function ()
{
    getLocation();
    return false;
};

var onStationsClicked = function ()
{
    loadRealtimeVelibData();
    return false;
};




//---------loc
var getLocation = function()
{
    //map.locate({setView:true, enableHighAccuracy: true});
    navigator.geolocation.getCurrentPosition(onLocationFound);
};

var onLocationFound = function(position)
{
    var lat = position.coords.latitude;
    var lon = position.coords.longitude;

    var ll = L.latLng(lat,lon);

    //TODO adapt duration to distance from map center
    map.panTo(ll, {animate:true, duration: 1});
    
    if (geolocMarker === undefined)
    {
        geolocMarker = L.marker(ll);

        geolocMarker.addTo(map);
        geolocMarker._icon.classList.add("test");
    }
    else geolocMarker.setLatLng(ll);



    console.log(geolocMarker._icon);
    
};









//--------- static stations data
var loadStaticVelibData = function(callback)
{
    var req = new XMLHttpRequest();
    req.onload = function () 
    {

        stationsData = JSON.parse(req.response);

        // console.log(stationsData.length);

        markers = [];
        markersDic = {};

        

        for (var i=0; i<stationsData.length; i++)
        {
            var stationData = stationsData[i];

            var m = L.marker([stationData.lat, stationData.lon], {icon: new iconClasses[5]() });
            
            //TODO add road info to OSM for to those 100+ stations
            if (stationData.road === undefined) 
            {
                //TODO add road info to OSM for to those 100+ stations
                // console.log(stationData);

            }

            m.name = makeStationName(stationData);
            m.id = stationData.id;
            m.state = 5;

            m.addEventListener('click', onMarkerClick);

            markers.push(m);
            markersDic[m.id] = m;
     

            m.addTo(map);
            
        }


        loadMarkers();

        if (typeof callback !== 'undefined') callback();
    };
    req.open("get", "velibEnhanced.json", true);
    req.send();
};


var nbRegexp = /^(face |face au )?\d+/i;

var makeStationName = function(s)
{
    if (s.road === undefined) return s.rawAddress;

    var name = "";

    var nbMatches = s.rawAddress.match(nbRegexp);

    if (nbMatches !== null) name = nbMatches[0].toLowerCase() + " ";

    name += s.road+ ", ";

    if (s.city != null && s.postcode != null && s.city.toLowerCase() == "paris")
    {
        var rawDistrict = s.postcode.substr(3,2);
        var district = (rawDistrict.substr(0,1) === "0") ? rawDistrict.substr(1,1) : rawDistrict;
        var suffix = "ème";
        if (district=="1") suffix= "er";

        name += district + "<sup>" + suffix + "</sup>";

    }
    else  name += s.city;


    return name;


};


var loadRealtimeVelibData = function()
{
    // console.log("loadRealtimeVelibData");
    

    var req = new XMLHttpRequest();
    req.onload = function ()
    {

        var dynStationsData = JSON.parse(req.response);

        // console.log(dynStationsData);

        timestamp = new Date(parseInt(dynStationsData.timestamp));
        

        for (var i=0; i<dynStationsData.stations.length; i++)
        {
            // console.log(dynStationsData.stations[i]);
            var stationData = dynStationsData.stations[i];
            var id = stationData.id;
            // console.log(id);
            var m = markersDic[id.toString()];

             if (typeof m === 'undefined')
            {
                console.log(id + " not found");
                continue;
            }

            m.bikeStands = stationData.t;
            m.availableBikeStands = stationData.e;
            m.availableBikes = stationData.b;

            if (m.availableBikes === 0)          m.state = 0;
            else if (m.availableBikes <= 3)          m.state = 1;
            else if (m.availableBikeStands === 0)      m.state = 4;
            else if (m.availableBikeStands <= 3)     m.state = 3;
            else                                m.state = 2;
        }

        loadMarkers();

        updateRefreshInfo();
    };

    req.open("get", "http://nerik.me/velibFetcher/stations.json", true);
    req.send();



};


var onMarkerClick = function (e)
{
    // console.log(e.target);
 
    var m = e.target;

    var id = m.id;

    // document.getElementById("info-station").innerHTML = m.name + ": " + m.availableBikes +"/" + m.bikeStands;
    adress.innerHTML = m.name;
    availableBikes.innerHTML = m.availableBikes;
    bikeStands.innerHTML = m.bikeStands;

    updateRefreshInfo();

    document.querySelector("#info").classList.add('shown');

};


var updateRefreshInfo = function()
{
    var timeSinceLastRefresh = Date.now() - timestamp.getTime();
    timeSinceLastRefresh = Math.round( timeSinceLastRefresh / 60000 );

    lastrefreshInfo.innerHTML = (timeSinceLastRefresh === 0)? "à l'instant" : timeSinceLastRefresh + "mn";
}



var loadMarkers = function()
{
    var bounds = map.getBounds();

    for (var i = 0; i < markers.length; i++)
    {
        var m = markers[i];

        m.setIcon( new iconClasses[m.state]() );
        // console.log("???"+m.state);
        if (bounds.contains(m.getLatLng()))
        {
            map.addLayer(m);
            m.addTo(map);
        }
        else map.removeLayer(m);

    }


};