var debug_mode = true;
var wait = 30000;
var vehicles = L.layerGroup().addTo(map);
var routes = L.layerGroup().addTo(map);
var date = null;
var first_boot = true;

function copyToClipboard(text) {
  var dummy = document.createElement("textarea");
  document.body.appendChild(dummy);
  dummy.value = text;
  dummy.select();
  document.execCommand("copy");
  document.body.removeChild(dummy);
}

//////////////////////////////////////////////////////////////
// this function is responsible for:// -> saving currently enabled overlays
// -> deleting all markers from map
// -> generating all new markers
// -> diabling all markers that was not previously selected
//////////////////////////////////////////////////////////////
function ztm_cleanup(vehicles_lines, vehicles_groups) {

  layers_status = [];
  all_layers = layers_box._layers; // copying leaflet object containing all layers and overlays to local variable
  for (var l = 0; l < all_layers.length; l++) // looping trough all overlays and checing if any is set to true
  {
    if (all_layers[l]["overlay"] == true) {
      if (all_layers[l]["layer"]["_map"] != null) {
        layers_status.push(all_layers[l]); // overlay is added to list if it is set to true
      }
    }
  }

  layers_box.remove(); // removal of old layers and overlays

  for (var l = 0; l < vehicles_lines.length; l++) // adding new overlays based on line number
  {
    vehicleType[String(vehicles_lines[l])] = L.layerGroup(vehicles_groups[String(vehicles_lines[l])]).addTo(map);
  }

  layers_box = L.control.layers(baseMaps, vehicleType).addTo(map); // creating new object containg all layers and overlays

  all_layers = layers_box._layers;
  for (var l = 0; l < all_layers.length; l++) // iterating trough all ovelays and checking for previosuly selected
  {
    if (all_layers[l]["overlay"] == true) {
      var found_line = false;
      for (var i = 0; i < layers_status.length; i++) {
        if (all_layers[l]["name"] == layers_status[i]["name"]) {
          console.log("showing up layer: " + layers_status[i]["name"])
          found_line = true;
          break;
        }
      }
      if (found_line == false) // layer will be disabled if overlay was not previously selected
      {
        all_layers[l]["layer"]["_map"] == null;
        all_layers[l]["layer"]["_mapToAdd"] == null;
        vehicleType[all_layers[l]["name"]].remove();
      }
    }
  }
}

/////////////////////////////////////////////////////////////
// this function is responsible for:
// -> acquisition of bus GPS data
// -> acquisition of bus route info
// -> acquisition of bus geeJSON track
/////////////////////////////////////////////////////////////
function ztm_request() {
  data = []
  var loading_panel = document.getElementById("loading");
  var loading_text = document.getElementById("loading_text");

  requests = [["https://ckan2.multimediagdansk.pl/gpsPositions","ładowanie pozycji gps"],
    ["https://ckan.multimediagdansk.pl/dataset/c24aa637-3619-4dc2-a171-a23eec8f2172/resource/22313c56-5acf-41c7-a5fd-dc5dc72b3851/download/routes.json","ładowanie listy tras"],
    ["https://ckan.multimediagdansk.pl/dataset/c24aa637-3619-4dc2-a171-a23eec8f2172/resource/b15bb11c-7e06-4685-964e-3db7775f912f/download/trips.json","ładowanie listy kursów"]
  ]

  // this code is responsible for retrieving data from http request
  for (let i = 0; i < requests.length; i++) {
    try {
      if(first_boot == true)
      {
        loading.style.display = "block";
        loading_text.innerHTML = requests[i][1];
      }
      if(debug_mode)
      {
        var startTime = new Date().getTime();
      }
      var raw_request_data = new XMLHttpRequest();
      raw_request_data.open("GET", requests[i][0], false);
      raw_request_data.send();
      if (raw_request_data.status != 200) {
        throw new Error("bad code");
      }
      data.push(JSON.parse(raw_request_data.responseText)); // pusing response to data variable
      if(debug_mode)
      {
        var endTime = new Date().getTime();
        console.log("downloaded " + i + " request in " + String(endTime-startTime) + " ms")
      }
      loading.style.display = "none";
    } catch {
      console.log("No internet connection or ztm servers are not responding");
      return;
    }
  }
  first_boot = false;
  loading.style.display = "none";
  return data;
}

// this function returns geoJSON path based on bus routeId and tripID
function ztm_get_route(date, routeId, tripId) {
  try {
    var raw_data_geojson = new XMLHttpRequest();
    raw_data_geojson.open("GET", "https://ckan2.multimediagdansk.pl/shapes?date=" + date + "&routeId=" + routeId + "&tripId=" + tripId, false);
    raw_data_geojson.send();
    if (raw_data_geojson.status != 200) {
      throw new Error("bad code");
    }
    var data_geojson = JSON.parse(raw_data_geojson.responseText);
    return (data_geojson);
  } catch {
    console.error("error when trying to downlaod error path");
  }
}

// this function return icon based on routeType parameter
function ztm_choose_icon(routeType) {
  if (routeType == "BUS") {
    choosen_icon = bus_icon
  } else if (routeType == "TRAM") {
    choosen_icon = tram_icon
  } else {
    choosen_icon = unknown_icon
  }
  return choosen_icon;
}

// this function return trip type name based on trip_type parameter
function ztm_converted_trip_type(trip_type) {
  converted_trip_type = ""
  if (trip_type == "MAIN") {
    converted_trip_type = "główny";
  } else if (trip_type == "SIDE") {
    converted_trip_type = "pasażerski";
  } else if (trip_type == "NON_PASSENGER") {
    converted_trip_type = "techniczny";
  } else if (trip_type == "UNKNOWN") {
    converted_trip_type = "nieznany";
  } else {
    console.log("error");
    converted_trip_type = "error";
  }
  return converted_trip_type
}

// this function return gps quality based on gps_quality parameter
function ztm_converted_gps_quality(gps_quality) {
  var gps_quality_converted = "";
  if (parseInt(gps_quality) == 3) {
    gps_quality_converted = "bardzo dobry";
  } else if (parseInt(gps_quality) == 2) {
    gps_quality_converted = "dobry";
  } else if (parseInt(gps_quality) == 1) {
    gps_quality_converted = "zły";
  } else if (parseInt(gps_quality) == 0) {
    gps_quality_converted = "brak sygnału";
  } else {
    console.log("error");
    gps_quality_converted = "error";
  }
  return gps_quality_converted;
}

// this function return direction based on direction parameter
function ztm_converted_direction(direction) {
  converted_direction = "";
  if (direction == 1) {
    converted_direction = "tam";
  } else if (direction == 2) {
    converted_direction = "powrót";
  } else {
    console.log("error");
    converted_direction = "error";
  }
  return converted_direction;
}

// this function return cleaner delay time based on delay parameter
function ztm_converted_delay(delay) {
  converted_delay = "";
  if (delay > 120) {
    converted_delay = parseInt(delay / 60) + " minut"
  } else {
    converted_delay = parseInt(delay) + " sekund"
  };
  return converted_delay
}

// this function appends vehicle marker to right overlay based on line number
function ztm_append_to_line_overlay(line, vehicles_lines, vehicles_groups, marker) {
  var found_line = false;
  for (var l = 0; l < vehicles_lines.length; l++) {
    if (vehicles_lines[l] == line) {
      found_line = true;
    }
  }
  if (found_line == false) {
    vehicles_lines.push(line);
    vehicles_groups[line] = [marker];
  } else {
    vehicles_groups[line].push(marker);
  }
  return vehicles_lines, vehicles_groups
}

function VEHICLES_MARKERS() {

  data = ztm_request()

  vehicles.clearLayers();
  routes.clearLayers();
  var vehicles_lines = [];
  var vehicles_groups = {};

  console.log(data[0]["Vehicles"].length + " vehicles loaded!");

  if(debug_mode)
  {
    var startTime = new Date().getTime();
  }

  for (var i = 0; i < data[0]["Vehicles"].length; i++) {
    date = Object.keys(data[1])[0];

    for (var x = 0; x < data[1][date]["routes"].length; x++) {
      if (data[0]["Vehicles"][i]["Line"] == data[1][date]["routes"][x]["routeShortName"]) {
        for (var t = 0; t < data[2][date]["trips"].length; t++) {
          if (data[2][date]["trips"][t]["tripId"] == data[0]["Vehicles"][i]['Route']) {

            // ##################  declaring variables #########################
            var id = data[0]["Vehicles"][i]['VehicleId'];
            var line = data[0]["Vehicles"][i]['Line'];
            var gps_quality = data[0]["Vehicles"][i]['GPSQuality']
            var lat = Number(data[0]["Vehicles"][i]['Lat']).toFixed(4);
            var lon = Number(data[0]["Vehicles"][i]['Lon']).toFixed(4);
            var coords = lat + ", " + lon;
            var direction = data[2][date]["trips"][t]["directionId"];
            var routeId = data[1][date]["routes"][x]["routeId"]
            var routeType = data[1][date]["routes"][x]["routeType"];
            var routeLongName = data[1][date]["routes"][x]["routeLongName"];
            var tripId = data[0]["Vehicles"][i]['Route'];
            var trip_type = data[2][date]["trips"][t]["type"]
            var speed = data[0]["Vehicles"][i]['Speed'];
            var data_generated = data[0]["Vehicles"][i]['DataGenerated'];
            var time_converted = (Date.parse(String(data_generated)) - new Date().getTime()) / 1000;
            var delay = data[0]["Vehicles"][i]['Delay'];
            var vehicleCode = data[0]["Vehicles"][i]['VehicleCode'];
            var vehicleId = data[0]["Vehicles"][i]['VehicleId'];
            // #################################################################

            // generating a marker with right icon at given coordinated
            var marker = L.marker([data[0]["Vehicles"][i]["Lat"], data[0]["Vehicles"][i]["Lon"]], {
              icon: ztm_choose_icon(routeType),
              title: routeLongName,
              id: id,
            }).addTo(vehicles);

            // binding small label below the icon that indicates vehicle line number
            marker.bindTooltip(data[0]["Vehicles"][i]['Line'], {
              permanent: true,
              direction: 'bottom',
              opacity: 0.8,
              offset: L.point(0, 10)
            })

            // binding popup with informations about the vehicle
            var popup_data =
              "<ul data-direction='"+ direction +"' data-tripId='" + tripId + "' data-routeId='" + routeId + "' style=' padding: 0;list-style-type: none;'>" +
              "<li style='text-align:center;'><p>" + "<span style='color:red;'>" + line + "  " + "</span><span><b>" + data[1][date]["routes"][x]["routeLongName"] + "</b></span></p></li>" +
              "<li><b>kierunek: </b>" + ztm_converted_direction(direction) + "</li>" +
              "<li></li>" +
              "<li><span style='display:inline;text-align:left;'><b>współrzędne: </b>" + coords + "</span>" +
              "<span style='display:inline;float:right;text-align:right;'><button onclick='copyToClipboard(\"" + coords + "\")' style='margin-top:-2px;cursor:pointer; border: solid 1px black;width:22px;height:22px;background-size:contain;background-image:url(static/images/copy.png);'></button></span></li>" +
              "<li></li>" +
              "<li><b>prędkość: </b>" + speed + "km/h</li>" +
              "<li><b>opóźnienie: </b> " + ztm_converted_delay(delay) + "</li>" +
              "<li><b>wygenerowane: </b> <span id='generated_" + vehicleId + "'>" + Math.abs(parseInt(time_converted)) + " sekund temu</span></li>" +
              "<li><b>sygnał gps: </b> " + ztm_converted_gps_quality(gps_quality) + "</li>" +
              "<li><b>rodzaj trasy: </b>" + ztm_converted_trip_type(trip_type) + "</li>" +
              "<li><b>kod pojazdu: </b>" + vehicleCode + "</li>" +
              "<li><b>ID pojazdu: </b>" + vehicleId + "</li>" +
              "</ul>";
            marker.bindPopup(popup_data);

            // script that will update time that passed after last update
            var data_str =
              "function update_data_" + String(data[0]["Vehicles"][i]['VehicleId']) + "(){" +
              "var t1 = Date.parse('" + String(data[0]["Vehicles"][i]['DataGenerated']) + "');" +
              "var t2 = new Date();" +
              "var dif = t1 - t2.getTime();" +
              "var Seconds_from_T1_to_T2 = dif / 1000;" +
              "var Seconds_Between_Dates = Math.abs(Seconds_from_T1_to_T2);" +
              "try {" +
              "document.getElementById('generated_" + String(data[0]["Vehicles"][i]['VehicleId']) + "').innerHTML = Math.abs(parseInt(Seconds_Between_Dates)) + ' sekund temu' ;" +
              "}" +
              "catch(err) {" +
              "}}" +
              "for(var x=0; x< parseInt(wait/1000); x++){" +
              "setTimeout(function() { update_data_" + String(data[0]["Vehicles"][i]['VehicleId']) + "(); }, (x+1)*1000);" +
              "}";
            eval(data_str);

            // adding vehicle to line overlay group
            vehicles_lines, vehicles_groups = ztm_append_to_line_overlay(line, vehicles_lines, vehicles_groups, marker);

            break;
          }
        }
        break;
      }
    }
  }

  if(debug_mode)
  {
    var endTime = new Date().getTime();
    console.log("all vehicles placed on map in " + String(endTime-startTime) + " ms")
  }

  ztm_cleanup(vehicles_lines, vehicles_groups);

  setTimeout(VEHICLES_MARKERS, wait); // callind fuction again after given time
}

//event responsible for drawing geoJSON path when vehicle is clicked
map.on('popupopen', function(e) {
  routes.clearLayers();
  var marker_str = String(e.popup._source._popup._content);
  var doc = new DOMParser().parseFromString(marker_str, "text/xml").firstChild;
  var tripId = doc.getAttribute("data-tripId");
  var routeId = doc.getAttribute("data-routeId");
  var direction = doc.getAttribute("data-direction");


  geojson = ztm_get_route(date, routeId, tripId)
  var myLines = [{
    "type": String(geojson["type"]),
    "coordinates": geojson["coordinates"]
  }];
  var myStyle = {
    "color": "red",
    "weight": 5,
    "opacity": 0.65
  };
  //L.geoJSON(myLines, {
  //  style: myStyle
  //}).addTo(routes);
  var reversed_coordinates = [];
  for (var i = 0; i < geojson["coordinates"].length; i++)
  {
    let local_lat = geojson["coordinates"][i][0]
    let local_lon = geojson["coordinates"][i][1]
    reversed_coordinates.push([local_lon, local_lat])
  }

  var polyline = L.polyline(reversed_coordinates, {style: myStyle}).addTo(routes);
  polyline.setStyle({
    color: 'red',
    weight: 5,
    opacity: 1
  });

  if(parseInt(direction) == 1)
  {
    var arrowHead = L.polylineDecorator(polyline, {
      patterns: [
          {offset: '0%', repeat: 30, symbol: L.Symbol.arrowHead({pixelSize: 17, polygon: false, pathOptions: {color: 'red',
          weight: 2,
          opacity: 1,stroke: true}})}
      ]
    }).addTo(routes);
  }
  else if(parseInt(direction) == 2)
  {
    var arrowHead = L.polylineDecorator(polyline, {
        patterns: [
            {offset: '0%', repeat: 30, symbol: L.Symbol.arrowHead({heading: 180, pixelSize: 17, polygon: false, pathOptions: {color: 'red',
            weight: 2,
            opacity: 1,stroke: true}})}
        ]
    }).addTo(routes);
  }
  else
  {
    console.error("wrong direction");
  }


});

//event responsible for purging geoJSON path when vehicle is clicked
map.on('popupclose', function(e) {
  routes.clearLayers();
});

VEHICLES_MARKERS();
