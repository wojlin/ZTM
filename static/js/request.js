var debug_mode = true;
var wait = 20000;
var timeout = 5000;

var stops_stop_load_zoom = 15;
var vehicles_data = [];
var vehicles = L.layerGroup().addTo(map);
var stops = L.layerGroup().addTo(map);
var routes = L.layerGroup().addTo(map);
var routes_stops = L.layerGroup().addTo(map);
var date = null;
var first_boot = true;
var data = [null, null, null, null, null];

var loading_panel = document.getElementById("loading");
var loading_text = document.getElementById("loading_text");
var error_panel = document.getElementById("eror");
var error_text = document.getElementById("error_text");

var current_marker = null;

var update_generated = true;

var requests = [
  ["https://ckan2.multimediagdansk.pl/gpsPositions", "ładowanie pozycji gps...", "!"],
  ["https://ckan.multimediagdansk.pl/dataset/c24aa637-3619-4dc2-a171-a23eec8f2172/resource/22313c56-5acf-41c7-a5fd-dc5dc72b3851/download/routes.json", "ładowanie listy tras...", "!"],
  ["https://ckan.multimediagdansk.pl/dataset/c24aa637-3619-4dc2-a171-a23eec8f2172/resource/b15bb11c-7e06-4685-964e-3db7775f912f/download/trips.json", "ładowanie listy kursów...", "!"],
  ["https://ckan.multimediagdansk.pl/dataset/c24aa637-3619-4dc2-a171-a23eec8f2172/resource/d3e96eb6-25ad-4d6c-8651-b1eb39155945/download/stopsingdansk.json", "ładowanie pozycji przystanków...", "."],
  ["https://ckan.multimediagdansk.pl/dataset/c24aa637-3619-4dc2-a171-a23eec8f2172/resource/3115d29d-b763-4af5-93f6-763b835967d6/download/stopsintrip.json", "ładowanie przystanków powiązanych z trasą...", "."]
]

// this fuction is responsible for copying text to device clipboard
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


// this function checks how many of data parts is corrupted
function check_packets_error() {

  if ((data[0] == null || data[1] == null) && first_boot) {
    error.style.display = 'block';
    error_text.innerHTML = "<p>dane o pojazdach nie zostały pomyślnie załadowane</p><p>Powodem tego mogą być przeciążone serwery ztm albo słąbe łacze internetowe</p><p>Aplikacja nie zadziała poprawnie</p>";
  } else if (data.some(element => element === null) && first_boot) {
    error.style.display = 'block';
    error_text.innerHTML = "<p>niektóre pakiety danych nie zostały pobrane z serwera z powodu przekroczenia limitu czasowego.</p><p>Powodem tego może być słabe łącze intenretowe w urządzeniu albo duże obciazenie serwerów ztm</p><p>Niektóre funkcje programu zostaną zablokowane</p>";
  }
}


// this function is responsible for making "synchronus" asynchronus http request
function makeRequest(i) {

  if (debug_mode) {
    var startTime = new Date().getTime();
  }

  loading_text.innerHTML = requests[i][1];

  let xhr = new XMLHttpRequest();
  xhr.open("GET", requests[i][0]);
  xhr.onload = function() {
    if (this.status >= 200 && this.status < 300) {

      if (debug_mode) {
        var endTime = new Date().getTime();
        console.log("downloaded " + i + " request in " + String(Number((endTime - startTime) / 1000).toFixed(2)) + " s")
      }
      data[i] = JSON.parse(xhr.responseText);
      if (i < requests.length - 1) {
        makeRequest(i + 1);
      } else {
        check_packets_error();
        first_boot = false;
        VEHICLES_MARKERS()
      }

    } else {
      if (debug_mode) {
        var endTime = new Date().getTime();
        console.log("failed " + i + " request in " + String(Number((endTime - startTime) / 1000).toFixed(2)) + " s")
      }
      if (i < requests.length - 1) {
        makeRequest(i + 1);
      } else {
        check_packets_error();
        first_boot = false;
        VEHICLES_MARKERS()
      }
    }
  };
  xhr.ontimeout = function() {
    if (debug_mode) {
      var endTime = new Date().getTime();
      console.log("aborted " + i + " request after " + String(Number((endTime - startTime) / 1000).toFixed(2)) + " s")
    }
    if (i < requests.length - 1) {
      makeRequest(i + 1);
    } else {
      check_packets_error();
      first_boot = false;
      VEHICLES_MARKERS()
    }
  };
  xhr.timeout = timeout;
  xhr.send();
}


/////////////////////////////////////////////////////////////
// this function is responsible for:
// -> acquisition of bus GPS data
// -> acquisition of bus route info
// -> acquisition of bus geeJSON track
/////////////////////////////////////////////////////////////
function ztm_request() {
  makeRequest(0);
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
  } else if (trip_type == "brak danych") {
    converted_trip_type = "brak danych";
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
  } else if (direction == "brak danych") {
    converted_direction = "brak danych";
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


// main fuction responsible for everything
function VEHICLES_MARKERS() {

  var saved_current_marker = null;
  if(current_marker != null)
  {
      saved_current_marker = current_marker;
  }

  stops.clearLayers();
  vehicles.clearLayers();
  routes.clearLayers();
  routes_stops.clearLayers();
  update_generated = false;

  var vehicles_lines = [];
  var vehicles_groups = {};
  vehicles_data = [];

  console.log(data);

  if (debug_mode) {
    var startTime = new Date().getTime();
  }

  if (data[0] != null && data[1] != null) {
    console.log(data[0]["Vehicles"].length + " vehicles loaded!");



    for (var i = 0; i < data[0]["Vehicles"].length; i++) {
      date = Object.keys(data[1])[0];

      for (var x = 0; x < data[1][date]["routes"].length; x++) {
        if (data[0]["Vehicles"][i]["Line"] == data[1][date]["routes"][x]["routeShortName"]) {

          if (data[2] != null) {
            for (var t = 0; t < data[2][date]["trips"].length; t++) {
              if (data[2][date]["trips"][t]["tripId"] == data[0]["Vehicles"][i]['Route']) {
                var direction = data[2][date]["trips"][t]["directionId"];
                var trip_type = data[2][date]["trips"][t]["type"]
                break;
              }
            }
          } else {
            var direction = "brak danych";
            var trip_type = "brak danych";
          }


          // ##################  declaring variables #########################
          var id = data[0]["Vehicles"][i]['VehicleId'];
          var line = data[0]["Vehicles"][i]['Line'];
          var gps_quality = data[0]["Vehicles"][i]['GPSQuality']
          var lat = Number(data[0]["Vehicles"][i]['Lat']).toFixed(4);
          var lon = Number(data[0]["Vehicles"][i]['Lon']).toFixed(4);
          var coords = lat + ", " + lon;

          var routeId = data[1][date]["routes"][x]["routeId"]
          var routeType = data[1][date]["routes"][x]["routeType"];
          var routeLongName = data[1][date]["routes"][x]["routeLongName"];
          var tripId = data[0]["Vehicles"][i]['Route'];

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
          vehicles_data.push(marker);
          // binding small label below the icon that indicates vehicle line number
          marker.bindTooltip(data[0]["Vehicles"][i]['Line'], {
            permanent: true,
            direction: 'bottom',
            opacity: 0.8,
            offset: L.point(0, 10)
          })

          // binding popup with informations about the vehicle
          var popup_data =
            "<ul data-generated='"+data_generated+"' data-id='"+ vehicleId +"' data-direction='" + direction + "' data-tripId='" + tripId + "' data-routeId='" + routeId + "' style=' padding: 0;list-style-type: none;'>" +
            "<li style='text-align:center;'><p>" + "<span style='color:red;'>" + line + "  " + "</span><span><b>" + data[1][date]["routes"][x]["routeLongName"] + "</b></span></p></li>" +
            "<li><b>kierunek: </b>" + ztm_converted_direction(direction) + "</li>" +
            "<li></li>" +
            "<li><span style='display:inline;text-align:left;'><b>współrzędne: </b>" + coords + "</span>" +
            "<span style='display:inline;float:right;text-align:right;'><button onclick='copyToClipboard(\"" + coords + "\")' style='margin-top:-2px;cursor:pointer; border: solid 1px black;width:22px;height:22px;background-size:contain;background-image:url(static/images/copy.png);'></button></span></li>" +
            "<li></li>" +
            "<li><b>prędkość: </b>" + speed + "km/h</li>" +
            "<li id='delay' ><b>opóźnienie: </b> " + ztm_converted_delay(delay) + "</li>" +
            "<li><b>wygenerowane: </b> <span id='generated_"+vehicleId+"'>" + Math.abs(parseInt(time_converted)) + "</span> sekund temu</li>" +
            "<li><b>sygnał gps: </b> " + ztm_converted_gps_quality(gps_quality) + "</li>" +
            "<li><b>rodzaj trasy: </b>" + ztm_converted_trip_type(trip_type) + "</li>" +
            "<li><b>kod pojazdu: </b>" + vehicleCode + "</li>" +
            "<li><b>ID pojazdu: </b>" + vehicleId + "</li>" +
            "</ul>";
          marker.bindPopup(popup_data);

          // adding vehicle to line overlay group
          vehicles_lines, vehicles_groups = ztm_append_to_line_overlay(line, vehicles_lines, vehicles_groups, marker);

          break;
        }

      }
    }
  }


  if (data[3] != null) {
    console.log(data[3]["stops"].length + " stops loaded!");



    for (var i = 0; i < data[3]["stops"].length; i++) {
      var stop_marker = L.marker([data[3]["stops"][i]["stopLat"], data[3]["stops"][i]["stopLon"]], {
        icon: bus_stop_icon,
        title: data[3]["stops"][i]["stopName"],
        id: data[3]["stops"][i]["stopId"],
      })

      if (map.getBounds().contains(stop_marker.getLatLng()) && map.getZoom() > stops_stop_load_zoom) {
        stop_marker.addTo(stops);
      }

      // binding small label below the icon that indicates vehicle line number
      stop_marker.bindTooltip(data[3]["stops"][i]["stopName"], {
        permanent: true,
        direction: 'bottom',
        opacity: 0.8,
        offset: L.point(0, 10)
      })
    }

  }

  if (debug_mode) {
    var endTime = new Date().getTime();
    console.log("all vehicles and stops placed on map in " + String(endTime - startTime) + " ms")
  }

  ztm_cleanup(vehicles_lines, vehicles_groups);

  loading_panel.style.display = "none";

  if(saved_current_marker != null)
  {
      var marker_str = String(saved_current_marker.popup._source._popup._content);
      var doc = new DOMParser().parseFromString(marker_str, "text/xml").firstChild;
      var id = doc.getAttribute("data-id");
      for (var i = 0; i < vehicles_data.length; i++)
      {
        var local_marker_str = String(vehicles_data[i]._popup._source._popup._content);
        var local_doc = new DOMParser().parseFromString(local_marker_str, "text/xml").firstChild;
        var local_id = local_doc.getAttribute("data-id");
        if(local_id == id)
        {
          vehicles_data[i].openPopup();
        }
      }
  }

  setTimeout(ztm_request, wait); // callind fuction again after given time
}


//event responsible for drawing geoJSON path when vehicle is clicked
map.on('popupopen', function(e) {
  current_marker = e;
  routes.clearLayers();
  routes_stops.clearLayers();
  var marker_str = String(e.popup._source._popup._content);
  var doc = new DOMParser().parseFromString(marker_str, "text/xml").firstChild;
  var tripId = doc.getAttribute("data-tripId");
  var id = String(doc.getAttribute("data-id"));
  var routeId = doc.getAttribute("data-routeId");
  var direction = doc.getAttribute("data-direction");
  var generated = doc.getAttribute("data-generated");
  // script that will update time that passed after last update
  update_generated = true;

  var data_str =
    "function update_data_"+id+"(){" +
    "var t1 = Date.parse('"+generated+"');" +
    "var t2 = new Date().getTime();" +
    "var dif = t1 - t2;" +
    "var Seconds_from_T1_to_T2 = dif / 1000;" +
    "var Seconds_Between_Dates = Math.floor(Math.abs(Seconds_from_T1_to_T2));" +
    "if(update_generated == true){"+
    "try{"+
    "document.getElementById('generated_"+id+"').innerHTML = Math.abs(parseInt(Seconds_Between_Dates));" +
    "setTimeout(function() { update_data_"+id+"(); }, 500);"+
    "}"+
    "catch{}"+
    "}else{update_generated = true;}"+
    "}" +
    "update_data_"+id+"();";
  eval(data_str);

  // drawing all stops on route of bus
  if (data[3] != null && data[4] != null) {
    for (var i = 0; i < data[4][date]["stopsInTrip"].length; i++) {
      if (routeId == data[4][date]["stopsInTrip"][i]["routeId"] && tripId == data[4][date]["stopsInTrip"][i]["tripId"]) {
        for (var s = 0; s < data[3]["stops"].length; s++) {
          if (data[3]["stops"][s]["stopId"] == data[4][date]["stopsInTrip"][i]["stopId"]) {
            var stop_marker = L.marker([data[3]["stops"][s]["stopLat"], data[3]["stops"][s]["stopLon"]], {
              icon: bus_stop_trip_icon,
              title: data[3]["stops"][s]["stopName"],
              id: data[3]["stops"][s]["stopId"],
            }).addTo(routes_stops);

            // binding small label below the icon that indicates stop name
            stop_marker.bindTooltip(data[4][date]["stopsInTrip"][i]["stopSequence"] + " " + data[3]["stops"][s]["stopName"], {
              permanent: true,
              direction: 'bottom',
              opacity: 0.8,
              offset: L.point(0, 10)
            })
            break;
          }
        }
      }
    }
  }
  if (data[0] != null && data[1] != null && data[2] != null) {

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

    // reversing lat with lon
    var reversed_coordinates = [];
    for (var i = 0; i < geojson["coordinates"].length; i++) {
      let local_lat = geojson["coordinates"][i][0]
      let local_lon = geojson["coordinates"][i][1]
      reversed_coordinates.push([local_lon, local_lat])
    }

    // drawing line
    var polyline = L.polyline(reversed_coordinates, {
      style: myStyle
    }).addTo(routes);
    polyline.setStyle({
      color: 'red',
      weight: 5,
      opacity: 1
    });

    // drawing arrows with respect to the route direction
    if (parseInt(direction) == 1) {
      var arrowHead = L.polylineDecorator(polyline, {
        patterns: [{
          offset: '0%',
          repeat: 30,
          symbol: L.Symbol.arrowHead({
            pixelSize: 17,
            polygon: false,
            pathOptions: {
              color: 'red',
              weight: 2,
              opacity: 1,
              stroke: true
            }
          })
        }]
      }).addTo(routes);
    } else if (parseInt(direction) == 2) {
      var arrowHead = L.polylineDecorator(polyline, {
        patterns: [{
          offset: '0%',
          repeat: 30,
          symbol: L.Symbol.arrowHead({
            heading: 180,
            pixelSize: 17,
            polygon: false,
            pathOptions: {
              color: 'red',
              weight: 2,
              opacity: 1,
              stroke: true
            }
          })
        }]
      }).addTo(routes);
    } else {
      console.error("wrong direction");
    }
  }
});


//event responsible for purging geoJSON path when vehicle is clicked
map.on('popupclose', function(e) {
  current_marker = null;
  update_generated = false;
  routes.clearLayers();
  routes_stops.clearLayers();
});


//event responsible for loading new bus stops on move
map.on('moveend', function(e) {
  stops.clearLayers();
  if (data[3] != null) {
    for (var i = 0; i < data[3]["stops"].length; i++) {
      var stop_marker = L.marker([data[3]["stops"][i]["stopLat"], data[3]["stops"][i]["stopLon"]], {
        icon: bus_stop_icon,
        title: data[3]["stops"][i]["stopName"],
        id: data[3]["stops"][i]["stopId"],
      })

      if (map.getBounds().contains(stop_marker.getLatLng()) && map.getZoom() > stops_stop_load_zoom) {
        stop_marker.addTo(stops);
      }

      // binding small label below the icon that indicates vehicle line number
      stop_marker.bindTooltip(data[3]["stops"][i]["stopName"], {
        permanent: true,
        direction: 'bottom',
        opacity: 0.8,
        offset: L.point(0, 10)
      })
    }
  }
});


setTimeout(ztm_request, 3000);
