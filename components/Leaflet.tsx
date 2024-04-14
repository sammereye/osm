import { Bounds, Element, ElementWithCenter, ElementWithWeight, LatLngQuery, LatLngQueryWithRoad, OverpassQuery } from "@/models/OverpassQuery";
import leaflet, { LatLngBounds, LatLngExpression, Map } from "leaflet";
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
  const [renderedCircles, setRenderedCircles] = useState<LatLngQueryWithRoad[]>([]);
  const [renderedRoute, setRenderedRoute] = useState<LatLngQueryWithRoad[]>([]);
  const [startingBuilding, setStartingBuilding] = useState<ElementWithCenter | null>(null);
  const [destinationBuilding, setDestinationBuilding] = useState<ElementWithCenter | null>(null);

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

  function getMapTiles(bounds: leaflet.LatLngBounds): Bounds[] {
    const tileSize = 0.0025;
    let northEdge = bounds.getNorth();
    let westEdge = bounds.getWest();
    let eastEdge = bounds.getEast();
    let southEdge = bounds.getSouth();

    let north = (northEdge + (northEdge % tileSize));
    let west = (westEdge + (westEdge % tileSize));

    const northSections: number[] = [north];
    while (north > southEdge) {
      north -= tileSize;
      north = parseFloat(north.toFixed(4));
      northSections.push(north);
    }

    const westSections: number[] = [west];
    while (west < eastEdge) {
      west += tileSize;
      west = parseFloat(west.toFixed(4));
      westSections.push(west);
    }

    const tiles: Bounds[] = [];

    for (let i = 0; i < northSections.length - 1; i ++) {
      for (let j = 0; j < westSections.length - 1; j ++) {
        tiles.push({
          north: northSections[i],
          south: northSections[i + 1],
          west: westSections[j],
          east: westSections[j + 1]
        });
      }
    }

    console.log(tiles);

    return tiles;
  }

  useEffect(() => {
    const loadMap = () => {
      if (map) {
        const bounds = map.getBounds();
        const mapTiles: Bounds[] = getMapTiles(bounds);
        
        for (let i = 0; i < mapTiles.length; i++) {
          // if (currentBounds.current?.getCenter().lat !== bounds.getCenter().lat || currentBounds.current?.getCenter().lng !== bounds.getCenter().lng) {
          //   currentBounds.current = bounds;
            fetch(
              "https://overpass-api.de/api/interpreter",
              {
                method: "POST",
                body: "data="+ encodeURIComponent(`
                  [out:json][timeout:25];
                  (
                    nwr["highway"="motorway"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
                    nwr["highway"="trunk"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
                    nwr["highway"="primary"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
                    nwr["highway"="secondary"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
                    nwr["highway"="tertiary"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
                    nwr["highway"="unclassified"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
                    
                    nwr["highway"="motorway_link"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
                    nwr["highway"="trunk_link"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
                    nwr["highway"="primary_link"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
                    nwr["highway"="secondary_link"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
                    nwr["highway"="tertiary_link"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
                    
                    nwr["highway"="living_street"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
                    nwr["highway"="service"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
                    nwr["highway"="residential"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
                    nwr["highway"="track"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
                    nwr["highway"="raceway"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
                    nwr["highway"="road"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
  
                    nwr["surface"="grass"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
                    nwr["landuse"="grass"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
                    nwr["waterway"="stream"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
                    nwr["building"="yes"](${mapTiles[i].south},${mapTiles[i].west},${mapTiles[i].north},${mapTiles[i].east});
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
                    if (prevRenderedRoads.filter(x => x.id === roadElement.id).length === 0) {
                      roads.push({
                        ...roadElement,
                        weight: getRoadWeight(roadElement)
                      });
                    }
                    if (roadData.current.filter(x => x.id === roadElement.id).length === 0) {
                      roadData.current.push(roadElement);
                    }
                  });
  
                  return [...prevRenderedRoads, ...roads];
                })
  
                const waterwayResults = results.elements.filter(e => e.tags && e.tags.waterway && e.geometry && e.nodes);
                setRenderedWaterways(prevRenderedWaterways => {
                  const waterways: Element[] = [];
                  waterwayResults.forEach(waterwayElement => {
                    if (waterways.filter(x => x.id === waterwayElement.id).length === 0) {
                      waterways.push(waterwayElement);
                    }
                    if (waterwayData.current.filter(x => x.id === waterwayElement.id).length === 0) {
                      waterwayData.current.push(waterwayElement);
                    }
                  });
  
                  return [...prevRenderedWaterways, ...waterways];
                })
  
                const grasslandResults = results.elements.filter(e => e.tags && ((e.tags.landuse && e.tags.landuse === 'grass') || (e.tags.surface && e.tags.surface === 'grass')) && e.geometry && e.nodes);
                setRenderedGrassland(prevRenderedGrassland => {
                  const grassland: Element[] = [];
                  grasslandResults.forEach(grasslandElement => {
                    if (grassland.filter(x => x.id === grasslandElement.id).length === 0) {
                      grassland.push(grasslandElement);
                    }
                    if (grasslandData.current.filter(x => x.id === grasslandElement.id).length === 0) {
                      grasslandData.current.push(grasslandElement);
                    }
                  });
  
                  return [...grassland, ...prevRenderedGrassland];
                })
        
                const buildingResults = results.elements.filter(e => e.tags && e.tags.building && e.tags.building === 'yes' && e.geometry && e.geometry.length > 3);
                
                setRenderedBuildings(prevRenderedBuildings => {
                  const buildings: Element[] = [];
                  buildingResults.forEach(buildingElement => {
                    if (buildings.filter(x => x.id === buildingElement.id).length === 0) {
                      buildings.push(buildingElement)
                    }
                    if (buildingData.current.filter(x => x.id === buildingElement.id).length === 0) {
                      buildingData.current.push(buildingElement)
                    }
                  });
  
                  return [...buildings, ...prevRenderedBuildings];
                })
              }
            });
          // }
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
  function calculateDistance(coord1: LatLngQueryWithRoad, coord2: LatLngQueryWithRoad) {
    const dx = coord1.lon - coord2.lon;
    const dy = coord1.lat - coord2.lat;
    return Math.sqrt(dx * dx + dy * dy); // Euclidean distance
  }

  function findClosestCoordinate(targetCoord: LatLngQueryWithRoad, coordArray: LatLngQueryWithRoad[]): LatLngQueryWithRoad {
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

  function findClosestPointOnLine(targetCoord: LatLngQueryWithRoad, lineSegment: LatLngQueryWithRoad[]): LatLngQueryWithRoad {
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
  
    return {lat: closestLat, lon: closestLon, roadId: targetCoord.roadId};
  }

  function findClosestLine(targetCoord: LatLngQueryWithRoad, coordArray: LatLngQueryWithRoad[]): LatLngQueryWithRoad {
    const closestCoordinate = findClosestCoordinate(targetCoord, coordArray);
    const closestCoordinateIndex = coordArray.findIndex(coord => coord.lat === closestCoordinate.lat && coord.lon === closestCoordinate.lon);

    let point1: LatLngQueryWithRoad = closestCoordinate;
    let point2: LatLngQueryWithRoad = closestCoordinate;
    let point3: LatLngQueryWithRoad = closestCoordinate;

    if (closestCoordinateIndex === 0) {
      point1 = coordArray[0];
      point2 = coordArray[1];
    } else if (closestCoordinateIndex === coordArray.length - 1) {
      point1 = coordArray[coordArray.length - 2];
      point2 = coordArray[coordArray.length - 1];
    } else {
      point1 = coordArray[closestCoordinateIndex - 1];
      point3 = coordArray[closestCoordinateIndex + 1];
    }

    const closestPointOnLine1 = findClosestPointOnLine(targetCoord, [point1, point2]);
    const closestPointOnLine2 = findClosestPointOnLine(targetCoord, [point3, point2]);

    const distanceOnLine1 = calculateDistance(closestPointOnLine1, targetCoord);
    const distanceOnLine2 = calculateDistance(closestPointOnLine2, targetCoord);

    let closestPoint = closestPointOnLine1;
    if (distanceOnLine2 < distanceOnLine1) {
      closestPoint = closestPointOnLine2;
    }

    return closestPoint;
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

  function heuristic(position0: LatLngQueryWithRoad, position1: LatLngQueryWithRoad) {
    let d1 = Math.abs(position1.lat - position0.lat);
    let d2 = Math.abs(position1.lon - position0.lon);
  
    return d1 + d2;
  }

  function searchForShortestPath(startPoint: LatLngQueryWithRoad, destinationPoint: LatLngQueryWithRoad): LatLngQueryWithRoad[] {
    let openList: LatLngQueryWithRoad[] = [{
      ...startPoint,
      g: 0,
      h: heuristic(startPoint, destinationPoint),
      f: heuristic(startPoint, destinationPoint)
     }];    
     let closedList: LatLngQueryWithRoad[] = [];


    while (openList.length > 0) {
      let lowestIndex = -1;
      for (let i = 0; i < openList.length; i++) {
        if (lowestIndex === -1 || (openList[i].f ?? 999999) < (openList[lowestIndex].f ?? 999999)) {
          lowestIndex = i;
        }
      }

      const currentNode = openList[lowestIndex];

      if (currentNode.lat === destinationPoint.lat && currentNode.lon === destinationPoint.lon) {
        let curr = currentNode;
        let path: LatLngQueryWithRoad[] = []
        while (curr.parent) {
          path.push(curr);
          curr = curr.parent;
        }

        return path.reverse();
      }

      openList = openList.filter(x => x.lat !== currentNode.lat && x.lon !== currentNode.lon);
      closedList.push(currentNode);
      const roadsCurrentNodeIsOn = roadData.current.filter(x => x.geometry.filter(y => y.lat === currentNode.lat && y.lon === currentNode.lon).length > 0);
      let neighborNodes: LatLngQueryWithRoad[] = [];
      roadsCurrentNodeIsOn.forEach((road) => {
        const currentNodeIndex = road.geometry.findIndex(coord => coord.lat === currentNode.lat && coord.lon === currentNode.lon);
        neighborNodes = [...neighborNodes, {...road.geometry[currentNodeIndex + 1], roadId: road.id}, {...road.geometry[currentNodeIndex - 1], roadId: road.id}]
      })

      neighborNodes.forEach(neighborNode => {
        if (!neighborNode || closedList.filter(x => x.lat === neighborNode.lat && x.lon === neighborNode.lon).length > 0) {
          return;
        }

        if (openList.filter(x => x.lat === neighborNode.lat && x.lon === neighborNode.lon).length === 0) {
          neighborNode.h = heuristic(neighborNode, destinationPoint);
          neighborNode.parent = currentNode;
          neighborNode.g = (currentNode.g ?? 999999) + 1;
          neighborNode.f = neighborNode.g + neighborNode.h;
          neighborNode.debug = "F: " + neighborNode.f + " G: " + neighborNode.g + " H: " + neighborNode.h;
          openList.push(neighborNode);
        }
      })
    }

    return [];
  }

  useEffect(() => {
    if (startingBuilding && destinationBuilding) {
      const startingBuildingAssociatedRoads = roadData.current.filter(x => x.tags && x.tags.name &&  x.tags.name === startingBuilding.tags["addr:street"]);
      const destinationBuildingAssociatedRoads = roadData.current.filter(x => x.tags && x.tags.name &&  x.tags.name === destinationBuilding.tags["addr:street"]);

      if (startingBuildingAssociatedRoads.length > 0 && destinationBuildingAssociatedRoads.length > 0) {
        const startingBuildingRoadPoints = startingBuildingAssociatedRoads.reduce((arr: LatLngQueryWithRoad[], road: Element) => [...arr, ...road.geometry.map(geo => { return { ...geo, roadId: road.id }})], []);
        const destinationBuildingRoadPoints = destinationBuildingAssociatedRoads.reduce((arr: LatLngQueryWithRoad[], road: Element) => [...arr, ...road.geometry.map(geo => { return { ...geo, roadId: road.id }})], []);
        
        const closestStartingBuildingPoint = findClosestLine(startingBuilding.center, removeDuplicateLatLngQueryWithRoad(startingBuildingRoadPoints)) 
        const closestDestinationBuildingPoint = findClosestLine(destinationBuilding.center, removeDuplicateLatLngQueryWithRoad(destinationBuildingRoadPoints)) 
        
        const closestStartingNode = findClosestCoordinate(closestStartingBuildingPoint, removeDuplicateLatLngQueryWithRoad(startingBuildingRoadPoints));
        const closestDestinationNode = findClosestCoordinate(closestDestinationBuildingPoint, removeDuplicateLatLngQueryWithRoad(destinationBuildingRoadPoints));

        const routeNodes = searchForShortestPath(closestStartingNode, closestDestinationNode);
        routeNodes.unshift();
        routeNodes.pop();
        const route = removeDuplicateLatLngQueryWithRoad([closestStartingBuildingPoint, ...routeNodes, closestDestinationBuildingPoint]);
        setRenderedRoute(route);
        setRenderedCircles((prevRenderedCircles: LatLngQueryWithRoad[]) => {
          return [...prevRenderedCircles, closestStartingBuildingPoint, closestDestinationBuildingPoint];
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


        {renderedRoute.length > 0 && 
          <Polyline positions={renderedRoute.map(x => { return { lat: x.lat, lng: x.lon } })} color="#4b80ea" fillOpacity={1} weight={5}></Polyline>
        }

        {renderedCircles.map((position, i) => (
          // @ts-ignore
          <Circle key={`${position.lat}-${position.lon}`} center={position} radius={5} color="#4b80ea" weight={4} fillColor="#eaedf1" fillOpacity={1} />
        ))}

        {false && cars.map((car) => (
          <Car key={car.id} roads={roadData.current} startingNode={car.startingNode} />
        ))}
      </MapContainer>
    </div>
  )
}