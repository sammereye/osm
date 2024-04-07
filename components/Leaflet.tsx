import { Element, OverpassQuery } from "@/models/OverpassQuery";
import { useAnimationFrame } from "framer-motion";
import leaflet from "leaflet";
import { useEffect, useRef, useState } from "react";
import { Circle, MapContainer, Polygon, Polyline, TileLayer } from "react-leaflet";
import Car from "./Car";

const position: leaflet.LatLngExpression = [39.80575, -86.22963]

export default function Leaflet() {
  const [roads, setRoads] = useState<Element[]>([]);
  const [buildings, setBuildings] = useState<Element[]>([]);

  useEffect(() => {
    fetch(
      "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        body: "data="+ encodeURIComponent(`
          [out:json][timeout:25];
          (
            nwr["highway"="residential"](39.80228849993572,-86.239972114563,39.81674434902068,-86.22583150863647);
            nwr["highway"="secondary"](39.80228849993572,-86.239972114563,39.81674434902068,-86.22583150863647);
            nwr["highway"="tertiary"](39.80228849993572,-86.239972114563,39.81674434902068,-86.22583150863647);
            nwr["highway"="service"](39.80228849993572,-86.239972114563,39.81674434902068,-86.22583150863647);
            nwr["building"="yes"](39.80228849993572,-86.239972114563,39.81674434902068,-86.22583150863647);
          );
          out geom;
        `)
      },
    )
    .then((data) => data.json())
    .then((results: OverpassQuery) => {
      if (results && results.elements && results.elements.length > 0) {
        const roadResults = results.elements.filter(e => e.tags && e.tags.highway);
        roadResults.forEach(roadElement => {
          setRoads(prevPolyLines => {
            return [...prevPolyLines, roadElement]
          })
        });

        const buildingResults = results.elements.filter(e => e.tags && e.tags.building && e.tags.building === 'yes');
        buildingResults.forEach(buildingElement => {
          setBuildings(prevPolygons => {
            return [...prevPolygons, buildingElement]
          })
        });

        console.log(buildingResults);
      }
    })
  }, [])

  function getRoadWeight(road: Element): number {
    switch (road?.tags.highway) {
      case 'primary':
        return 12;
      case 'secondary':
        return 9;
      case 'tertiary':
        return 7;
      case 'residential':
        return 5;
      case 'service':
        return 3;
      default:
        return 5;
    }
  }


  return (
    <div>
      <MapContainer className="w-screen h-screen" center={position} zoom={17} zoomControl={false} minZoom={17} maxZoom={17} preferCanvas>
      {/* <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      /> */}
      {roads.map((road, i) => (
        <Polyline key={i} positions={road.geometry} color="#a8dadc" weight={getRoadWeight(road)}></Polyline>
      ))}

      {buildings.map((building, i) => (
        <Polygon key={i} positions={building.geometry} fillColor="#457b9d" fillOpacity={1} stroke={false}></Polygon>
        ))}
        {[...Array(5)].map((e, i) => (
          <Car key={i} roads={roads} startingNode={180704110} />
        ))}
    </MapContainer>
    </div>
  )
}