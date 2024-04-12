import { Element, ElementWithWeight, LatLngQuery, LatLngQueryWithRoad, OverpassQuery } from "@/models/OverpassQuery";
import leaflet, { LatLngExpression, Map } from "leaflet";
import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, MapContainer, Polygon, Polyline, TileLayer } from "react-leaflet";
import Car from "./Car";
import Building from "./Building";

const position: leaflet.LatLngExpression = [39.80575, -86.22963]

export default function Leaflet() {
  const roadData = useRef<Element[]>([]);
  const buildingData = useRef<Element[]>([]);
  const waterwayData = useRef<Element[]>([]);
  const grasslandData = useRef<Element[]>([]);
  const currentBounds = useRef<leaflet.LatLngBounds | null>(null);

  const [map, setMap] = useState<Map>();
  const mapRef = useCallback((mapNode: Map) => {
    setMap(mapNode)
  }, []);
  
  const [renderedRoads, setRenderedRoads] = useState<ElementWithWeight[]>([]);
  const [renderedBuildings, setRenderedBuildings] = useState<Element[]>([]);
  const [renderedWaterways, setRenderedWaterways] = useState<Element[]>([]);
  const [renderedGrassland, setRenderedGrassland] = useState<Element[]>([]);
  const [renderedCircles, setRenderedCircles] = useState<LatLngQuery[]>([]);
  const [startingBuilding, setStartingBuilding] = useState<Element | null>(null);
  const [destinationBuilding, setDestinationBuilding] = useState<Element | null>(null);

  type Car = {
    id: number,
    startingNode: number
  }

  const [cars, setCars] = useState<Car[]>([...Array(3)].map((e, i) => {
    return {
      id: i,
      startingNode: 180704110
    }
  }))

  function getRoadWeight(road: Element): number {
    let weight = 5;

    switch (road?.tags.highway) {
      case 'motorway':
      case 'trunk':
      case 'primary':
      case 'motorway_link':
      case 'trunk_link':
      case 'primary_link':
        weight = 13;
        break;
        case 'secondary':
        case 'secondary_link':
        weight = 11;
        break;
      case 'tertiary':
      case 'tertiary_link':
        weight = 9;
        break;
      case 'residential':
      case 'road':
      case 'raceway':
      case 'living_street':
        weight = 7;
        break;
      default:
        weight = 5;
    }

    return weight;
  }

  useEffect(() => {
    const loadMap = () => {
      if (map) {
        const bounds = map.getBounds();
        const bottomLeftLat = bounds.getSouthWest().lat;
        const bottomLeftLng = bounds.getSouthWest().lng;
        const topRightLat = bounds.getNorthEast().lat;
        const topRightLng = bounds.getNorthEast().lng;
  
        const bottomLeftLatStreet = bottomLeftLat - 0.001;
        const bottomLeftLngStreet = bottomLeftLng + 0.001
        const topRightLatStreet = topRightLat + 0.001;
        const topRightLngStreet = topRightLng - 0.001;
  
        if (currentBounds.current?.getCenter().lat !== bounds.getCenter().lat || currentBounds.current?.getCenter().lng !== bounds.getCenter().lng) {
          currentBounds.current = bounds;
          fetch(
            "https://overpass-api.de/api/interpreter",
            {
              method: "POST",
              body: "data="+ encodeURIComponent(`
                [out:json][timeout:25];
                (
                  nwr["highway"="motorway"](${bottomLeftLatStreet},${bottomLeftLngStreet},${topRightLatStreet},${topRightLngStreet});
                  nwr["highway"="trunk"](${bottomLeftLatStreet},${bottomLeftLngStreet},${topRightLatStreet},${topRightLngStreet});
                  nwr["highway"="primary"](${bottomLeftLatStreet},${bottomLeftLngStreet},${topRightLatStreet},${topRightLngStreet});
                  nwr["highway"="secondary"](${bottomLeftLatStreet},${bottomLeftLngStreet},${topRightLatStreet},${topRightLngStreet});
                  nwr["highway"="tertiary"](${bottomLeftLatStreet},${bottomLeftLngStreet},${topRightLatStreet},${topRightLngStreet});
                  nwr["highway"="unclassified"](${bottomLeftLatStreet},${bottomLeftLngStreet},${topRightLatStreet},${topRightLngStreet});
                  
                  nwr["highway"="motorway_link"](${bottomLeftLatStreet},${bottomLeftLngStreet},${topRightLatStreet},${topRightLngStreet});
                  nwr["highway"="trunk_link"](${bottomLeftLatStreet},${bottomLeftLngStreet},${topRightLatStreet},${topRightLngStreet});
                  nwr["highway"="primary_link"](${bottomLeftLatStreet},${bottomLeftLngStreet},${topRightLatStreet},${topRightLngStreet});
                  nwr["highway"="secondary_link"](${bottomLeftLatStreet},${bottomLeftLngStreet},${topRightLatStreet},${topRightLngStreet});
                  nwr["highway"="tertiary_link"](${bottomLeftLatStreet},${bottomLeftLngStreet},${topRightLatStreet},${topRightLngStreet});
                  
                  nwr["highway"="living_street"](${bottomLeftLatStreet},${bottomLeftLngStreet},${topRightLatStreet},${topRightLngStreet});
                  nwr["highway"="service"](${bottomLeftLatStreet},${bottomLeftLngStreet},${topRightLatStreet},${topRightLngStreet});
                  nwr["highway"="residential"](${bottomLeftLatStreet},${bottomLeftLngStreet},${topRightLatStreet},${topRightLngStreet});
                  nwr["highway"="track"](${bottomLeftLatStreet},${bottomLeftLngStreet},${topRightLatStreet},${topRightLngStreet});
                  nwr["highway"="raceway"](${bottomLeftLatStreet},${bottomLeftLngStreet},${topRightLatStreet},${topRightLngStreet});
                  nwr["highway"="road"](${bottomLeftLatStreet},${bottomLeftLngStreet},${topRightLatStreet},${topRightLngStreet});

                  nwr["surface"="grass"](${bottomLeftLatStreet},${bottomLeftLngStreet},${topRightLatStreet},${topRightLngStreet});
                  nwr["landuse"="grass"](${bottomLeftLatStreet},${bottomLeftLngStreet},${topRightLatStreet},${topRightLngStreet});
                  nwr["waterway"="stream"](${bottomLeftLatStreet},${bottomLeftLngStreet},${topRightLatStreet},${topRightLngStreet});
                  nwr["building"="yes"](${bottomLeftLat},${bottomLeftLng},${topRightLat},${topRightLng});
                );
                out geom;
              `)
            },
          )
          .then((data) => data.json())
          .then((results: OverpassQuery) => {
            if (results && results.elements && results.elements.length > 0) {
              const roadResults = results.elements.filter(e => e.tags && e.tags.highway && e.geometry && e.nodes);
              setRenderedRoads(prevRenderedRoads => {
                const roads: ElementWithWeight[] = [];
                roadResults.forEach(roadElement => {
                  roads.push({
                    ...roadElement,
                    weight: getRoadWeight(roadElement)
                  });
                  if (roadData.current.filter(x => x.id === roadElement.id).length === 0) {
                    roadData.current.push(roadElement);
                  }
                });

                return roads;
              })

              const waterwayResults = results.elements.filter(e => e.tags && e.tags.waterway && e.geometry && e.nodes);
              setRenderedWaterways(prevRenderedWaterways => {
                const waterways: Element[] = [];
                waterwayResults.forEach(waterwayElement => {
                  waterways.push(waterwayElement);
                  if (waterwayData.current.filter(x => x.id === waterwayElement.id).length === 0) {
                    waterwayData.current.push(waterwayElement);
                  }
                });

                return waterways;
              })

              const grasslandResults = results.elements.filter(e => e.tags && ((e.tags.landuse && e.tags.landuse === 'grass') || (e.tags.surface && e.tags.surface === 'grass')) && e.geometry && e.nodes);
              setRenderedGrassland(prevRenderedGrassland => {
                const grassland: Element[] = [];
                grasslandResults.forEach(grasslandElement => {
                  grassland.push(grasslandElement);
                  if (grasslandData.current.filter(x => x.id === grasslandElement.id).length === 0) {
                    grasslandData.current.push(grasslandElement);
                  }
                });

                return grassland;
              })
      
              const buildingResults = results.elements.filter(e => e.tags && e.tags.building && e.tags.building === 'yes' && e.geometry && e.geometry.length > 3);
              
              setRenderedBuildings(prevRenderedBuildings => {
                const buildings: Element[] = [];
                buildingResults.forEach(buildingElement => {
                  buildings.push(buildingElement)
                  if (buildingData.current.filter(x => x.id === buildingElement.id).length === 0) {
                    // buildingElement.geometry = simplifyBuilding(buildingElement.geometry)
                    buildingData.current.push(buildingElement)
                  }
                });

                return buildings;
              })
            }
          });
        }
      }
    }

    if (map) {
      loadMap()

      map.addEventListener("dragend", () => {
        loadMap()
      });
    }
  }, [map])

  // Function to calculate distance between two coordinates
  function calculateDistance(coord1: LatLngQuery, coord2: LatLngQuery) {
    const dx = coord1.lon - coord2.lon;
    const dy = coord1.lat - coord2.lat;
    return Math.sqrt(dx * dx + dy * dy); // Euclidean distance
  }

  function findClosestCoordinate(targetCoord: LatLngQuery, coordArray: LatLngQuery[]): LatLngQuery {
    // Error handling: Ensure valid input
    if (!Array.isArray(coordArray) || coordArray.length === 0) {
      throw new Error("Invalid coordArray: must be a non-empty array");
    }
  
    // Logic to find the closest coordinate
    let closestCoord = null;
    let minDistance = Infinity;
  
    for (const coord of coordArray) {
      const distance = calculateDistance(targetCoord, coord);
      if (distance < minDistance) {
        minDistance = distance;
        closestCoord = coord;
      }
    }
  
    return closestCoord || coordArray[0];
  }

  function findClosestPointOnLine(targetCoord: LatLngQuery, lineSegment: LatLngQuery[]) {
    // Destructure coordinates for clarity
    const { lat: lat1, lon: lon1} = lineSegment[0];
    const { lat: lat2, lon: lon2} = lineSegment[1];
  
    // Calculate line parameters (avoid division by zero issues)
    const dlat = lat2 - lat1;
    const dlon = lon2 - lon1;
    const lineLengthSquared = dlat * dlat + dlon * dlon;
  
    // Special case: Line is a single point
    if (lineLengthSquared === 0) {
      return lineSegment[0]; 
    }
  
    // Project the point onto the line extent
    let t = ((targetCoord.lat - lat1) * dlat + (targetCoord.lon - lon1) * dlon) / lineLengthSquared;
  
    // Clamp 't' to the line segment's range (0 to 1)
    t = Math.max(0, Math.min(1, t));
  
    // Calculate coordinates of the closest point on the line 
    const closestLat = lat1 + t * dlat;
    const closestLon = lon1 + t * dlon;
  
    return {lat: closestLat, lon: closestLon};
  }

  function findClosestLine(targetCoord: LatLngQuery, coordArray: LatLngQuery[]): LatLngQuery[] {
    const closestCoordinate = findClosestCoordinate(targetCoord, coordArray);
    const closestCoordinateIndex = coordArray.findIndex(coord => coord.lat === closestCoordinate.lat && coord.lon === closestCoordinate.lon);

    if (closestCoordinateIndex === 0) {
      return [coordArray[0], coordArray[1]]
    } else if (closestCoordinateIndex === coordArray.length - 1) {
      return [coordArray[coordArray.length - 2], coordArray[coordArray.length - 1]]
    }

    const closestPointOnLine1 = findClosestPointOnLine(targetCoord, [coordArray[closestCoordinateIndex - 1], closestCoordinate]);
    const closestPointOnLine2 = findClosestPointOnLine(targetCoord, [coordArray[closestCoordinateIndex + 1], closestCoordinate]);

    const distanceOnLine1 = calculateDistance(closestPointOnLine1, targetCoord);
    const distanceOnLine2 = calculateDistance(closestPointOnLine2, targetCoord);

    let closestPoint = closestPointOnLine1;
    if (distanceOnLine2 < distanceOnLine1) {
      closestPoint = closestPointOnLine2;
    }

    return [closestPoint];
  }

  function removeDuplicateLatLngQueryWithRoad(arr: LatLngQueryWithRoad[]) {
    const seenCoords = new Set();
    const uniqueArr = [];
  
    for (const obj of arr) {
      const coordKey = `${obj.lat},${obj.lon},${obj.roadId}`; // Create a combined key
      if (!seenCoords.has(coordKey)) {
        uniqueArr.push(obj);
        seenCoords.add(coordKey);
      }
    }
  
    return uniqueArr;
  }

  useEffect(() => {
    if (startingBuilding && destinationBuilding) {
      const startingBuildingAssociatedRoads = roadData.current.filter(x => x.tags && x.tags.name &&  x.tags.name === startingBuilding.tags["addr:street"]);
      const destinationBuildingAssociatedRoads = roadData.current.filter(x => x.tags && x.tags.name &&  x.tags.name === destinationBuilding.tags["addr:street"]);

      if (startingBuildingAssociatedRoads.length > 0 && destinationBuildingAssociatedRoads.length > 0) {
        const closestStartingBuildingPoints = findClosestLine(startingBuilding.geometry[0], removeDuplicateLatLngQueryWithRoad(startingBuildingAssociatedRoads.reduce((arr: LatLngQueryWithRoad[], road: Element) => [...arr, ...road.geometry.map(geo => { return { ...geo, roadId: road.id }})], []))) 
        const closestDestinationBuildingPoints = findClosestLine(destinationBuilding.geometry[0], removeDuplicateLatLngQueryWithRoad(destinationBuildingAssociatedRoads.reduce((arr: LatLngQueryWithRoad[], road: Element) => [...arr, ...road.geometry.map(geo => { return { ...geo, roadId: road.id }})], []))) 
        setRenderedCircles(prevRenderedCircles => {
          const circles =  [...prevRenderedCircles, ...closestStartingBuildingPoints, ...closestDestinationBuildingPoints]
          return circles
        })
      }
    }
  }, [startingBuilding, destinationBuilding, roadData, setStartingBuilding, setDestinationBuilding])

  return (
    <div>
      <MapContainer ref={mapRef} className="w-screen h-screen" center={position} zoom={18} zoomControl={false} minZoom={18} maxZoom={18}>
      {/* <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      /> */}

        {renderedGrassland.map((grassland, i) => (
          // @ts-ignore
          <Polygon key={grassland.id} positions={grassland.geometry} fillColor="#a7dfb6" fillOpacity={1} stroke={false}></Polygon>
        ))}

        {renderedWaterways.map((waterway, i) => (
          // @ts-ignore
          <Polyline key={waterway.id} positions={waterway.geometry} color="#b3daff" fillOpacity={1} weight={7}></Polyline>
        ))}

        {renderedRoads.map((road, i) => (
          // @ts-ignore
          <Polyline key={road.id} positions={road.geometry} color="#ffffff" fillOpacity={1} weight={road.weight}></Polyline>
        ))}

        {renderedBuildings.map((building, i) => (
          <Building key={building.id} building={building} startingBuilding={startingBuilding} destinationBuilding={destinationBuilding} setStartingBuilding={setStartingBuilding} setDestinationBuilding={setDestinationBuilding} />
        ))}

        {renderedCircles.map((position, i) => (
          // @ts-ignore
          <Circle key={`${position.lat}-${position.lon}`} center={position} radius={5} fillColor="#4b80ea" />
        ))}

        {false && cars.map((car) => (
          <Car key={car.id} roads={roadData.current} startingNode={car.startingNode} />
        ))}
      </MapContainer>
    </div>
  )
}