import { Bounds, Element, ElementWithCenter, ElementWithWeight, LatLngQuery, LatLngQueryWithRoad, OverpassQuery } from "@/models/OverpassQuery";
import leaflet, { LatLngBounds, LatLngExpression, Map } from "leaflet";
import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, MapContainer, Pane, Polygon, Polyline, TileLayer } from "react-leaflet";
import Car from "./Car";
import Building from "./Building";

const BASE_WEIGHT = 5;

export default function Leaflet() {
  const roadData = useRef<Element[]>([]);
  const buildingData = useRef<Element[]>([]);
  const waterwayData = useRef<Element[]>([]);
  const grasslandData = useRef<Element[]>([]);
  const renderedTiles = useRef<Bounds[]>([]);
  const tileData = useRef<OverpassQuery[]>([]);
  const renderedRoute = useRef<LatLngQueryWithRoad[]>([]);
  
  const [userPosition, setUserPosition] = useState<leaflet.LatLngExpression | null>(null);
  const [map, setMap] = useState<Map>();

  useEffect(() => {
    function getAndSetLocation() {
      var geolocationOptions = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
        
      };
  
      function success(pos: GeolocationPosition) {
        var crd = pos.coords;
        // console.log("Your current position is:");
        // console.log(`Latitude : ${crd.latitude}`);
        // console.log(`Longitude: ${crd.longitude}`);
        // console.log(`More or less ${crd.accuracy} meters.`);
    
        setUserPosition([crd.latitude, crd.longitude]);
        if (map) {
          map.panTo([crd.latitude, crd.longitude])
        }
      }
    
      function errors(err: GeolocationPositionError) {
        console.warn(`ERROR(${err.code}): ${err.message}`);
      }
  
      if (navigator.geolocation) {
        navigator.permissions
        .query({ name: "geolocation" })
        .then(function (result) {
          if (result.state === 'granted') {
            navigator.geolocation.getCurrentPosition(success, errors, geolocationOptions);
          } else {
            console.log("Don't have access to location")
          }
        });
      } else {
        console.log("Geolocation is not supported by this browser.");
      }
    }

    getAndSetLocation();

    const getLocationIntervalId = setInterval(() => {
      getAndSetLocation();
    }, 5000);

    return () => { clearInterval(getLocationIntervalId) }
  }, [map]);

  const mapRef = useCallback((mapNode: Map) => {
    if (mapNode) {
      setMap(mapNode)
      mapNode.attributionControl.setPrefix(false);
    }
  }, []);
  
  const [screenWidth, setScreenWidth] = useState<number>(0);
  const [renderedRoads, setRenderedRoads] = useState<ElementWithWeight[]>([]);
  const [renderedBuildings, setRenderedBuildings] = useState<Element[]>([]);
  const [renderedWaterways, setRenderedWaterways] = useState<Element[]>([]);
  const [renderedGrassland, setRenderedGrassland] = useState<Element[]>([]);
  const [renderedCircles, setRenderedCircles] = useState<LatLngQueryWithRoad[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<ElementWithCenter | null>(null);
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

  useEffect(() => {
    function handleResize() {
      setScreenWidth(window.innerWidth)
    }
    
    window.addEventListener("resize", handleResize)
    
    handleResize()
    
    return () => { 
      window.removeEventListener("resize", handleResize)
    }
  }, [setScreenWidth])

  function getScaleSize() {
    return screenWidth / 800;
  }

  function getHalfWidth() {
    return screenWidth / 800 * 400;
  }

  function getQuarterWidth() {
    return screenWidth / 800 * 200;
  }

  function getRoadWeight(road: Element): number {
    let weight = BASE_WEIGHT;

    switch (road?.tags.highway) {
      case 'motorway':
      case 'trunk':
      case 'primary':
      case 'motorway_link':
      case 'trunk_link':
      case 'primary_link':
        weight += 13;
        break;
        case 'secondary':
        case 'secondary_link':
        weight += 11;
        break;
      case 'tertiary':
      case 'tertiary_link':
        weight += 9;
        break;
      case 'residential':
      case 'road':
      case 'raceway':
      case 'living_street':
        weight += 7;
        break;
      default:
        weight += 5;
    }

    return weight;
  }

  function getMapTiles(bounds: leaflet.LatLngBounds): Bounds[] {
    const tileSize = 0.005;
    const mapSize = 800;
    let northEdge = bounds.getNorth();
    let westEdge = bounds.getWest();
    let eastEdge = bounds.getEast();
    let southEdge = bounds.getSouth();

    let north = Math.round(mapSize * (northEdge + (tileSize - (northEdge % tileSize)) + tileSize)) / mapSize;
    let west = Math.round(mapSize * (westEdge - (tileSize + (westEdge % tileSize)) - tileSize)) / mapSize;

    const northSections: number[] = [north];
    while (north > (southEdge - tileSize)) {
      north -= tileSize;
      north = Math.round(north * mapSize) / mapSize;
      northSections.push(north);
    }

    const westSections: number[] = [west];
    while (west < (eastEdge + tileSize)) {
      west += tileSize;
      west = Math.round(west * mapSize) / mapSize;
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

    return tiles;
  }

  useEffect(() => {
    function renderResults(results: OverpassQuery) {
      const roadResults = results.elements.filter(e => e.tags && e.tags.highway && e.geometry && e.nodes);
      setRenderedRoads(prevRenderedRoads => {
        const roads: ElementWithWeight[] = [];
        roadResults.forEach(roadElement => {
          roadElement.tileId = results.id;
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
          waterwayElement.tileId = results.id;
          if (prevRenderedWaterways.filter(x => x.id === waterwayElement.id).length === 0) {
            waterways.push(waterwayElement);
          }
          if (waterwayData.current.filter(x => x.id === waterwayElement.id).length === 0) {
            waterwayData.current.push(waterwayElement);
          }
        });
  
        return [...prevRenderedWaterways, ...waterways];
      })
  
      const grasslandResults = results.elements.filter(e => e.tags && ((e.tags.landuse && e.tags.landuse === 'grass') || (e.tags.surface && e.tags.surface === 'grass') || (e.tags.leisure && e.tags.leisure === 'park')) && e.geometry && e.nodes);
      setRenderedGrassland(prevRenderedGrassland => {
        const grassland: Element[] = [];
        grasslandResults.forEach(grasslandElement => {
          grasslandElement.tileId = results.id;
          if (prevRenderedGrassland.filter(x => x.id === grasslandElement.id).length === 0) {
            grassland.push(grasslandElement);
          }
          if (grasslandData.current.filter(x => x.id === grasslandElement.id).length === 0) {
            grasslandData.current.push(grasslandElement);
          }
        });
  
        return [...grassland, ...prevRenderedGrassland];
      })
  
      const buildingResults = results.elements.filter(e => e.tags && e.tags.building && e.tags.building === 'yes' && e.geometry && e.geometry.length >= 3);
      
      setRenderedBuildings(prevRenderedBuildings => {
        const buildings: Element[] = [];
        buildingResults.forEach(buildingElement => {
          buildingElement.tileId = results.id;
          if (prevRenderedBuildings.filter(x => x.id === buildingElement.id).length === 0) {
            buildings.push(buildingElement)
          }
          if (buildingData.current.filter(x => x.id === buildingElement.id).length === 0) {
            buildingData.current.push(buildingElement)
          }
        });
  
        return [...buildings, ...prevRenderedBuildings];
      })
    }

    const loadMap = () => {
      if (map) {
        const bounds = map.getBounds();
        map.dragging.disable();
        const mapTiles: Bounds[] = getMapTiles(bounds);

        removeOutOfViewElements(mapTiles);

        const tilesToRender: Bounds[] = [];

        mapTiles.forEach(tile => {
          if (renderedTiles.current.filter(x => x.north === tile.north && x.west === tile.west).length === 0) {
            tilesToRender.push(tile);
          }
        });
        renderedTiles.current = mapTiles;
        
        for (let i = 0; i < tilesToRender.length; i++) {
          const tile = tilesToRender[i];
          const existingData = tileData.current.filter(x => x.id === `${tile.north},${tile.west}`)[0];
          if (existingData) {
            renderResults(existingData);
          } else {
            fetch(
              "https://overpass-api.de/api/interpreter",
              {
                method: "POST",
                body: "data="+ encodeURIComponent(`
                  [out:json][timeout:25];
                  (
                    way(${tile.south},${tile.west},${tile.north},${tile.east})["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link|living_street|service|residential|track|raceway|road"];
                    way(${tile.south},${tile.west},${tile.north},${tile.east})["surface"="grass"];
                    way(${tile.south},${tile.west},${tile.north},${tile.east})["landuse"="grass"];
                    way(${tile.south},${tile.west},${tile.north},${tile.east})["leisure"="park"];
                    way(${tile.south},${tile.west},${tile.north},${tile.east})["waterway"="stream"];
                    way(${tile.south},${tile.west},${tile.north},${tile.east})["building"="yes"]["addr:street"];
                  );
                  out geom;
                `)
              },
            )
            .then((data) => data.json())
            .then((results: OverpassQuery) => {
              if (results && results.elements && results.elements.length > 0) {
                results.id = `${tile.north},${tile.west}`;
                tileData.current.push(results);
                renderResults(results);
              }
            });
          }
        }
      }
    }

    if (map) {
      loadMap()

      map.addEventListener("dragend", () => {
        loadMap()
      });
    }
  }, [map, tileData])

    // Function to calculate distance between two coordinates
    function calculateDistance(coord1: LatLngQueryWithRoad, coord2: LatLngQueryWithRoad) {
      const dx = coord1.lon - coord2.lon;
      const dy = coord1.lat - coord2.lat;
      return Math.sqrt(dx * dx + dy * dy); // Euclidean distance
    }

  function removeOutOfViewElements(renderedTiles: Bounds[]) {
    const tileIds = renderedTiles.map(tile => `${tile.north},${tile.west}`);

    setRenderedRoads(renderedRoads => renderedRoads.filter(x => x.tileId && tileIds.includes(x.tileId)))
    setRenderedGrassland(renderedGrassland => renderedGrassland.filter(x => x.tileId && tileIds.includes(x.tileId)))
    setRenderedWaterways(renderedWaterways => renderedWaterways.filter(x => x.tileId && tileIds.includes(x.tileId)))
    setRenderedBuildings(renderedBuildings => renderedBuildings.filter(x => x.tileId && tileIds.includes(x.tileId)))
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

          path.push(curr);
  
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
            const currentNodeG = currentNode.g ? currentNode.g : 0;
            neighborNode.g = currentNodeG + heuristic(currentNode, neighborNode);
            neighborNode.f = neighborNode.g + neighborNode.h;
            neighborNode.debug = "F: " + neighborNode.f + " G: " + neighborNode.g + " H: " + neighborNode.h;
            openList.push(neighborNode);
          }
        })
      }
  
      return [];
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

    function distanceToLine(point1: LatLngQueryWithRoad, point2: LatLngQueryWithRoad, point3: LatLngQueryWithRoad) {
      // Convert degrees to radians
      const lat1Rad = toRadians(point1.lat);
      const lon1Rad = toRadians(point1.lon);
      const lat2Rad = toRadians(point2.lat);
      const lon2Rad = toRadians(point2.lon);
      const lat3Rad = toRadians(point3.lat);
      const lon3Rad = toRadians(point3.lon);
    
      // Calculate the vector along the line
      const dx = lon2Rad - lon1Rad;
      const dy = lat2Rad - lat1Rad;
    
      // Calculate the vector from point1 to point3
      const dX = lon3Rad - lon1Rad;
      const dY = lat3Rad - lat1Rad;
    
      // Compute the distance from point3 to the line
      const numerator = dX * dy - dY * dx;
      const denominator = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
      const distance = Math.abs(numerator / denominator);
    
      // Convert radians back to degrees (optional)
      return distance * (180 / Math.PI); // Uncomment for degrees
      // return distance; // Keep commented for radians
    }
    
    // Helper function to convert degrees to radians
    function toRadians(degrees: number) {
      return degrees * (Math.PI / 180);
    }

    function removeEndPointsIfNeeded(arr: LatLngQueryWithRoad[]) {
      const cleanedUpRoute = [...arr];
  
      if (cleanedUpRoute.length >= 3) {
        const [startingPoint, secondPoint, thirdPoint] = cleanedUpRoute.slice(0,3);
        const distance = distanceToLine(thirdPoint, secondPoint, startingPoint);
        // If all three points are on the same lat or lon axis
        if (distance !== 0 && distance < 0.0000000000001) {
          if (calculateDistance(startingPoint, thirdPoint) < calculateDistance(secondPoint, thirdPoint)) {
            cleanedUpRoute.splice(1, 1);
          }
        }
      }
  
      if (cleanedUpRoute.length >= 3) {
        const [thirdToLastPoint, secondToLastPoint, endingPoint] = cleanedUpRoute.slice(-3);

        const distance = distanceToLine(thirdToLastPoint, secondToLastPoint, endingPoint);
        // If all three points are on the same lat or lon axis
        if (distance !== 0 && distance < 0.0000000000001) {
          if (calculateDistance(endingPoint, thirdToLastPoint) < calculateDistance(secondToLastPoint, thirdToLastPoint)) {
            cleanedUpRoute.splice(cleanedUpRoute.length - 2, 1);
          }
        }
      }
      // console.log(cleanedUpRoute);
  
      return cleanedUpRoute;
    }
    
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

        let routeNodes = searchForShortestPath(closestStartingNode, closestDestinationNode);

        routeNodes = removeDuplicateLatLngQueryWithRoad([closestStartingBuildingPoint, ...routeNodes, closestDestinationBuildingPoint]);
        routeNodes = removeEndPointsIfNeeded(routeNodes);
        
        renderedRoute.current = routeNodes;
        setRenderedCircles((prevRenderedCircles: LatLngQueryWithRoad[]) => {
          return [...prevRenderedCircles, closestStartingBuildingPoint, closestDestinationBuildingPoint];
        })
      }
    }
  }, [startingBuilding, destinationBuilding, roadData])

  function seededRandom(seed: number) {
    let state = seed;
    
    // Linear Congruential Generator (LCG) algorithm
    const multiplier = 1103515245;
    const increment = 12345;
    const mod = Math.pow(2, 31);
  
    state = (multiplier * state + increment) % mod;
    return state / mod;
  }

  function getWoodGenerationAmount() {
    const base_generation = 7;
    let generationAmount = base_generation;
    if (selectedBuilding) {
      const randVal = seededRandom(selectedBuilding.id);

      generationAmount += Math.floor(Math.pow(2, randVal * 6));
    }

    return generationAmount;
  }

  if (userPosition) {
    return (
      <div className="h-dvh w-dvw flex justify-center items-center">
        <div className="pb-[56px]">
          {selectedBuilding &&
            <>
              <div className="text-center text-sm tracking-tight text-stone-700 font-bold">{selectedBuilding?.tags["addr:housenumber"]} {selectedBuilding?.tags["addr:street"]}</div>
              <div className="text-center mb-3 font-bold text-stone-800">{getWoodGenerationAmount()} 🪵 / min</div>
            </>
          }
          <div className="relative overflow-hidden rounded-3xl border border-[#e8eaef]" style={{ width: `${screenWidth}px`, height: `${screenWidth}px` }}>
            <div className="absolute" style={{ transform: `scale(${getScaleSize()})`, top: `${(screenWidth - 800) / 2}px`, left: `${(screenWidth - 800) / 2}px` }}>
              <MapContainer ref={mapRef} className="w-[800px] h-[800px]" center={userPosition} zoom={19} zoomControl={false} touchZoom={false} minZoom={19} maxZoom={19}>
              {/* <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              /> */}
  
                <Pane name="pane-grassland" style={{ zIndex: 500 }}>
                  {renderedGrassland.map((grassland, i) => (
                    // @ts-ignore
                    <Polygon key={grassland.id} positions={grassland.geometry} fillColor="#a7dfb6" fillOpacity={1} stroke={false}></Polygon>
                  ))}
                </Pane>
  
                <Pane name="pane-waterways" style={{ zIndex: 501 }}>
                  {renderedWaterways.map((waterway, i) => (
                    // @ts-ignore
                    <Polyline key={waterway.id} positions={waterway.geometry} color="#b3daff" fillOpacity={1} weight={BASE_WEIGHT + 7}></Polyline>
                  ))}
                </Pane>
  
                <Pane name="pane-roads" style={{ zIndex: 502 }}>
                  {renderedRoads.map((road, i) => (
                    // @ts-ignore
                    <Polyline key={road.id} positions={road.geometry} color="#ffffff" fillOpacity={1} weight={road.weight}></Polyline>
                  ))}
                </Pane>
  
                <Pane name="pane-building" style={{ zIndex: 503 }}>
                  {renderedBuildings.map((building, i) => (
                    <Building key={building.id} building={building} selectedBuilding={selectedBuilding} startingBuilding={startingBuilding} destinationBuilding={destinationBuilding} setStartingBuilding={setStartingBuilding} setDestinationBuilding={setDestinationBuilding} setSelectedBuilding={setSelectedBuilding} BASE_WEIGHT={BASE_WEIGHT} />
                  ))}
                </Pane>
  
                <Pane name="pane-route" style={{ zIndex: 504 }}>
                  {renderedRoute.current.length > 0 && 
                    <Polyline positions={renderedRoute.current.map(x => { return { lat: x.lat, lng: x.lon } })} color="#4b80ea" fillOpacity={1} weight={BASE_WEIGHT + 5}></Polyline>
                  }
                </Pane>
                  
                <Pane name="pane-circles" style={{ zIndex: 505 }}>
                  {renderedCircles.map((position, i) => (
                    // @ts-ignore
                    <Circle key={`${position.lat}-${position.lon}`} center={position} radius={5} color="#4b80ea" weight={BASE_WEIGHT + 4} fillColor="#eaedf1" fillOpacity={1} />
                  ))}
                </Pane>     
  
                {false && cars.map((car) => (
                  <Car key={car.id} roads={roadData.current} startingNode={car.startingNode} />
                ))}

                <Pane name="pane-user-circle" style={{ zIndex: 506 }}>
                  {(
                    // @ts-ignore
                    <Circle center={userPosition} radius={3} color="#4b80ea" weight={6} fillColor="#dce5f2" fillOpacity={1} />
                  )}
                </Pane>
              </MapContainer>
            </div>
          </div>
        </div>
      </div>
    )
  }
}