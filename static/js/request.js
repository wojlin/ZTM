var wait = 10000;
var vehicles = L.layerGroup().addTo(map);
var routes = L.layerGroup().addTo(map);
var date = null;

function copyToClipboard(text)
{
    var dummy = document.createElement("textarea");
    document.body.appendChild(dummy);
    dummy.value = text;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
}


function map_cleanup(vehicles_groups, vehicles_lines)
{

  layers_status = [];
  all_layers = layers_box._layers; // copying leaflet object containing all layers and overlays to local variable
  for (var l = 0; l < all_layers.length; l++) // looping trough all overlays and checing if any is set to true
  {
      if(all_layers[l]["overlay"] == true)
      {
          if(all_layers[l]["layer"]["_map"] != null)
          {
              layers_status.push(all_layers[l]); // overlay is added to list if it is set to true
              console.log(all_layers[l])
          }
      }
  }

  layers_box.remove(); // removal of old layers and overlays

  for(var l = 0; l < vehicles_lines.length; l++)
  {
      vehicleType[String(vehicles_lines[l])] =  L.layerGroup(vehicles_groups[String(vehicles_lines[l])]).addTo(map);
  }



  layers_box = L.control.layers(baseMaps,vehicleType).addTo(map); // creating new object containg all layers and overlays

  all_layers = layers_box._layers;
  for (var l = 0; l < all_layers.length; l++)
  {
      if(all_layers[l]["overlay"] == true)
      {
          var found_line = false;
          for (var i = 0; i < layers_status.length; i++)
          {
              if(all_layers[l]["name"] == layers_status[i]["name"])
              {
                  console.log("showing up layer: " + layers_status[i]["name"])
                  found_line = true;
                  break;
              }
          }
          if(found_line == false)
          {
            all_layers[l]["layer"]["_map"] == null;
            all_layers[l]["layer"]["_mapToAdd"] == null;
            vehicleType[all_layers[l]["name"]].remove();
          }
      }
  }
}

function VEHICLES_MARKERS()
{
    var raw_data_gps = new XMLHttpRequest();
    raw_data_gps.open("GET", "https://ckan2.multimediagdansk.pl/gpsPositions", false);
    raw_data_gps.send();
    var data_gps = JSON.parse(raw_data_gps.responseText);

    var raw_data_line = new XMLHttpRequest();
    raw_data_line.open("GET", "https://ckan.multimediagdansk.pl/dataset/c24aa637-3619-4dc2-a171-a23eec8f2172/resource/22313c56-5acf-41c7-a5fd-dc5dc72b3851/download/routes.json", false);
    raw_data_line.send();
    var data_line = JSON.parse(raw_data_line.responseText);

    var raw_data_trip = new XMLHttpRequest();
    raw_data_trip.open("GET", "https://ckan.multimediagdansk.pl/dataset/c24aa637-3619-4dc2-a171-a23eec8f2172/resource/b15bb11c-7e06-4685-964e-3db7775f912f/download/trips.json", false);
    raw_data_trip.send();
    var data_trip = JSON.parse(raw_data_trip.responseText);

    var data = [data_gps,data_line,data_trip];


    vehicles.clearLayers();
    var vehicles_lines = [];
    var vehicles_groups = {};

    console.log(data)

    console.log(data[0]["Vehicles"].length + " vehicles loaded!");



    bus_layer = [];
    tram_layer = [];

    for (var i = 0; i < data[0]["Vehicles"].length; i++)
    {
        date = Object.keys(data[1])[0];

        for (var x = 0; x < data[1][date]["routes"].length; x++)
        {
            if(data[0]["Vehicles"][i]["Line"] == data[1][date]["routes"][x]["routeShortName"])
            {
                for (var t = 0; t < data[2][date]["trips"].length; t++)
                {
                     if(data[2][date]["trips"][t]["tripId"] == data[0]["Vehicles"][i]['Route'])
                     {
                        if(data[1][date]["routes"][x]["routeType"] == "BUS")
                        {
                            chosen_icon = bus_icon
                        }
                        else if(data[1][date]["routes"][x]["routeType"] == "TRAM")
                        {
                            chosen_icon = tram_icon
                        }else
                        {
                            chosen_icon = unknown_icon
                        }

                        var marker = L.marker([data[0]["Vehicles"][i]["Lat"], data[0]["Vehicles"][i]["Lon"]],
                        {
                            icon: chosen_icon,
                            title: data[1][date]["routes"][x]["routeLongName"],
                            id: data[0]["Vehicles"][i]['VehicleId'],
                        }).addTo(vehicles);

                        if(data[1][date]["routes"][x]["routeType"] == "BUS")
                        {
                            bus_layer.push(marker)
                        }
                        else if(data[1][date]["routes"][x]["routeType"] == "TRAM")
                        {
                             tram_layer.push(marker)
                        }else
                        {

                        }

                        var coords = Number(data[0]["Vehicles"][i]['Lat']).toFixed(4) + ", " + String(Number(data[0]["Vehicles"][i]['Lon']).toFixed(4));

                        var gps_quality = "";
                        if(parseInt(data[0]["Vehicles"][i]['GPSQuality']) == 3)
                        {
                            gps_quality = "bardzo dobry";
                        }
                        else if(parseInt(data[0]["Vehicles"][i]['GPSQuality']) == 2)
                        {
                            gps_quality = "dobry";
                        }
                        else if(parseInt(data[0]["Vehicles"][i]['GPSQuality']) == 1)
                        {
                            gps_quality = "zły";
                        }
                        else if(parseInt(data[0]["Vehicles"][i]['GPSQuality']) == 0)
                        {
                            gps_quality = "brak sygnału";
                        }
                        else
                        {
                            console.log("error");
                            gps_quality = "error";
                        }

                        var startDate = new Date();
                        var endDate   = new Date();

                        var time_converted = (Date.parse(String(data[0]["Vehicles"][i]['DataGenerated'])) - new Date().getTime()) / 1000;

                        routeType = ""
                        if(data[2][date]["trips"][t]["type"] == "MAIN")
                        {
                            routeType = "główny";
                        }
                        else if(data[2][date]["trips"][t]["type"] == "SIDE")
                        {
                            routeType = "pasażerski";
                        }
                        else if(data[2][date]["trips"][t]["type"] == "NON_PASSENGER")
                        {
                            routeType = "techniczny";
                        }
                        else if(data[2][date]["trips"][t]["type"] == "UNKNOWN")
                        {
                            routeType = "nieznany";
                        }
                        else
                        {
                            console.log("error");
                            routeType = "error";
                        }

                        direction = "";
                        if(data[2][date]["trips"][t]["directionId"] == 1)
                        {
                            direction = "tam";
                        }
                        else if(data[2][date]["trips"][t]["directionId"] == 2)
                        {
                            direction = "powrót";
                        }
                        else
                        {
                            console.log("error");
                            direction = "error";
                        }


                        delay = data[0]["Vehicles"][i]['Delay'];

                        if(delay > 120)
                        {
                            delay_str = parseInt(delay/60) + " minut"
                        }else
                        {
                            delay_str = parseInt(delay) + " sekund"
                        }


                        //tripId = data[0]["Vehicles"][i]['Route'];
                        tripId = data[0]["Vehicles"][i]['Route'];
                        routeId =  data[1][date]["routes"][x]["routeId"]
                        //routeId = data[1][date]["routes"][x]["routeId"]            //data[2][date]["trips"][t]["tripHeadsign"]   data[1][date]["routes"][x]["routeLongName"]
                        var popup_data =
                        "<ul data-tripId='"+tripId+"' data-routeId='"+ routeId +"' style=' padding: 0;list-style-type: none;'>"+
                            "<li style='text-align:center;'><p>"+"<span style='color:red;'>"+data[0]["Vehicles"][i]['Line']+"  "+"</span><span><b>"+ data[1][date]["routes"][x]["routeLongName"]+ "</b></span></p></li>" +
                            "<li><b>kierunek: </b>" + direction  + "</li>" +
                            "<li></li>" +
                            "<li><span style='display:inline;text-align:left;'><b>współrzędne: </b>" + coords  + "</span>"+
                            "<span style='display:inline;float:right;text-align:right;'><button onclick='copyToClipboard(\""+coords+"\")' style='margin-top:-2px;cursor:pointer; border: solid 1px black;width:22px;height:22px;background-size:contain;background-image:url(static/images/copy.png);'></button></span></li>" +
                            "<li></li>" +
                            "<li><b>prędkość: </b>" + data[0]["Vehicles"][i]['Speed']  + "km/h</li>" +
                            "<li><b>opóźnienie: </b> " + delay_str  + "</li>" +
                            "<li><b>wygenerowane: </b> <span id='generated_"+ data[0]["Vehicles"][i]['VehicleId']+ "'>" + Math.abs(parseInt(time_converted))  + " sekund temu</span></li>" +
                            "<li><b>sygnał gps: </b> " + gps_quality  + "</li>" +
                            "<li><b>rodzaj trasy: </b>" + routeType +"</li>"+
                            //"<li><b>numer trasy: </b>" + data[0]["Vehicles"][i]['Route']  + "</li>" +
                            //"<li><b>id trasy: </b>" + data[2][date]["trips"][t]["tripId"]  + "</li>" +
                            "<li><b>kod pojazdu: </b>" + data[0]["Vehicles"][i]['VehicleCode']  + "</li>" +
                            //"<li><b>ID pojazdu: </b>" + data[0]["Vehicles"][i]['VehicleId'] + "</li>" +
                            //"<li><b>kod zadania: </b>" + data[0]["Vehicles"][i]['VehicleService']+"</li>"+
                        "</ul>";


                        var data_str =
                        "function update_data_"+String(data[0]["Vehicles"][i]['VehicleId'])+"(){"+
                        "var t1 = Date.parse('" + String(data[0]["Vehicles"][i]['DataGenerated']) + "');" +
                        "var t2 = new Date();"+
                        "var dif = t1 - t2.getTime();"+
                        "var Seconds_from_T1_to_T2 = dif / 1000;"+
                        "var Seconds_Between_Dates = Math.abs(Seconds_from_T1_to_T2);"+
                        "try {"+
                        "document.getElementById('generated_"+String(data[0]["Vehicles"][i]['VehicleId'])+"').innerHTML = Math.abs(parseInt(Seconds_Between_Dates)) + ' sekund temu' ;"+
                        "}"+
                        "catch(err) {"+
                        "}}"+
                        "for(var x=0; x< parseInt(wait/1000); x++){"+
                        "setTimeout(function() { update_data_"+String(data[0]["Vehicles"][i]['VehicleId'])+"(); }, (x+1)*1000);"+
                        "}";



                        marker.bindTooltip(data[0]["Vehicles"][i]['Line'],
                        {
                            permanent: true,
                            direction: 'bottom',
                            opacity: 0.8,
                            offset: L.point(0,10)
                        })


                        marker.bindPopup(popup_data);

                        eval(data_str);

                        var found_line = false;
                        for(var l = 0; l < vehicles_lines.length; l++)
                        {
                            if(vehicles_lines[l] == data[0]["Vehicles"][i]['Line'])
                            {
                                found_line = true;
                            }
                        }
                        if(found_line == false)
                        {
                            vehicles_lines.push(data[0]["Vehicles"][i]['Line']);
                            vehicles_groups[data[0]["Vehicles"][i]['Line']] = [marker];
                        }else
                        {
                            vehicles_groups[data[0]["Vehicles"][i]['Line']].push(marker);
                        }

                        break;
                    }
                }
                break;
            }
        }
    }



    map_cleanup(vehicles_groups, vehicles_lines);


    /*

    for(var l = 0; l < vehicles_lines.length; l++)
    {
        vehicleType[String(vehicles_lines[l])] =  L.layerGroup(vehicles_groups[String(vehicles_lines[l])]);
    }



    //vehicleType["bus"] = L.layerGroup(bus_layer);
    //vehicleType["tram"] = L.layerGroup(tram_layer);

    // #########################################################################
    layers_status = [];
    all_layers = layers_box._layers; // copying leaflet object containing all layers and overlays to local variable
    for (var l = 0; l < all_layers.length; l++) // looping trough all overlays and checing if any is set to true
    {
        if(all_layers[l]["overlay"] == true)
        {
            if(all_layers[l]["layer"]["_map"] != null)
            {
                layers_status.push(all_layers[l]); // overlay is added to list if it is set to true
                console.log(all_layers[l])
            }
        }
    }
    // #########################################################################


    // #########################################################################
    layers_box.remove(); // removal of old layers and overlays
    layers_box = L.control.layers(baseMaps,vehicleType).addTo(map); // creating new object containg all layers and overlays


    all_layers = layers_box._layers;
    for (var l = 0; l < all_layers.length; l++)
    {
        if(all_layers[l]["overlay"] == true)
        {
            for (var y = 0; y < layers_status.length; y++)
            {
                if(layers_status[y]["layer"]["_map"] != null && layers_status[y]["name"] == all_layers[l]["name"])
                {
                    console.log(layers_status[y]["name"])

                    //all_layers[l]["layer"]["_map"] == null;
                    //all_layers[l]["layer"]["_mapToAdd"] == null;
                    //vehicleType[all_layers[l]["name"]].remove()
                    break;
                }
            }
        }
    }
    */


    setTimeout(VEHICLES_MARKERS, wait);
}

function get_route(date, routeId, tripId)
{
    var raw_data_geojson = new XMLHttpRequest();
    raw_data_geojson.open("GET", "https://ckan2.multimediagdansk.pl/shapes?date="+date+"&routeId="+routeId+"&tripId="+tripId, false);
    raw_data_geojson.send();
    var data_geojson = JSON.parse(raw_data_geojson.responseText);
    return(data_geojson);
}

VEHICLES_MARKERS();


map.on('popupopen', function(e) {
  routes.clearLayers();
  var marker_str = String(e.popup._source._popup._content);
  var doc = new DOMParser().parseFromString(marker_str, "text/xml").firstChild;
  tripId = doc.getAttribute("data-tripId");
  routeId = doc.getAttribute("data-routeId");

    geojson = get_route(date,routeId,tripId)


    var myLines = [{
        "type": String(geojson["type"]),
        "coordinates": geojson["coordinates"]
    }];

    var myStyle = {
        "color": "red",
        "weight": 5,
        "opacity": 0.65
    };

    L.geoJSON(myLines, {
        style: myStyle
    }).addTo(routes);

});

map.on('popupclose', function(e) {
  routes.clearLayers();
});
