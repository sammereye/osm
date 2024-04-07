import { Element } from "@/models/OverpassQuery"
import { useAnimationFrame } from "framer-motion";
import leaflet from "leaflet"
import { useEffect, useRef } from "react";
import { Circle } from "react-leaflet";

type CarProps = {
  roads: Element[],
  startingNode: number
}

export default function Car({ roads, startingNode }: CarProps) {
  const circlePosition = useRef<leaflet.LatLngExpression>({ lat: 39.80575, lng: -86.22963});
  const circleRef = useRef<leaflet.Circle>(null);
  const distanceTraveled = useRef<number>(0);
  const currentNode = useRef<number>(startingNode);
  const currentRoad = useRef<Element | null>(null);
  const currentSpeed = useRef<number>(40);
  const targetNode = useRef<number>(-1);
  const previousNode = useRef<number>(-1);
  const pathEl = useRef<SVGPathElement>(document.createElementNS("http://www.w3.org/2000/svg", "path"));

  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.addEventListener("click", (ele) => {
        circleRef.current?.setStyle({ fillColor: "purple" })
      })
    }
  }, [circleRef])

  function setDefaultSpeed() {
    switch (currentRoad.current?.tags.highway) {
      case 'primary':
        currentSpeed.current = 70;
        break;
      case 'secondary':
        currentSpeed.current = 45;
        break;
      case 'tertiary':
        currentSpeed.current = 35;
        break;
      case 'residential':
        currentSpeed.current = 25;
        break;
      case 'service':
        currentSpeed.current = 15;
        break;
    }
  }

  function findPotentialNodes() {
    // debugger;
    const nodeRoads = roads.filter(road => road.nodes.includes(currentNode.current))
    const uniqueRoads = nodeRoads.reduce((arr: Element[], ele: Element) => arr.filter(x => x.id === ele.id).length > 0 ? arr : [...arr, ele], []);
    const potentialTargetNodes: number[] = [];
    
    uniqueRoads.forEach(road => {
      const matchingNodeIndex = road.nodes.indexOf(currentNode.current);

      if (matchingNodeIndex > -1) {
        const previousNodeInArr = road.nodes[matchingNodeIndex - 1];
        if (previousNodeInArr && !potentialTargetNodes.includes(previousNodeInArr) && previousNodeInArr !== previousNode.current) {
          potentialTargetNodes.push(previousNodeInArr)
        }

        const nextNodeInArr = road.nodes[matchingNodeIndex + 1];
        if (nextNodeInArr && !potentialTargetNodes.includes(nextNodeInArr) && nextNodeInArr !== previousNode.current) {
          potentialTargetNodes.push(nextNodeInArr)
        }
      }
    });

    if (potentialTargetNodes.length === 0) {
      potentialTargetNodes.push(previousNode.current);
    }

    targetNode.current = potentialTargetNodes[Math.floor(Math.random() * potentialTargetNodes.length)];

    
    const roadWithBothNodes = roads.filter(road => road.nodes.includes(currentNode.current) && road.nodes.includes(targetNode.current))[0]

    if (roadWithBothNodes) {
      currentRoad.current = roadWithBothNodes;
      if (roadWithBothNodes.tags.maxspeed) {
        const speed = roadWithBothNodes.tags.maxspeed.split(' ')[0];
        if (speed && !Number.isNaN(parseInt(speed))) {
          currentSpeed.current = parseInt(speed);
        } else {
          setDefaultSpeed();
        }
      } else if (roadWithBothNodes.tags.highway) {
        setDefaultSpeed();
      }
      const currentNodeIndex = roadWithBothNodes.nodes.indexOf(currentNode.current);
      const targetNodeIndex = roadWithBothNodes.nodes.indexOf(targetNode.current);
      const currentNodeLatLng = roadWithBothNodes.geometry[currentNodeIndex];
      const targetNodeLatLng = roadWithBothNodes.geometry[targetNodeIndex];
      const newPathD = `M${currentNodeLatLng.lat} ${currentNodeLatLng.lon} L${targetNodeLatLng.lat} ${targetNodeLatLng.lon}`
      pathEl.current.setAttribute("d", newPathD);
    }
  }

  useAnimationFrame((time, delta) => {
    if (circleRef.current) {
      if (targetNode.current === -1) {
        findPotentialNodes()
      }

      if (targetNode.current !== -1) {
        const totalLength = pathEl.current.getTotalLength();
        distanceTraveled.current += .000000007 * delta * currentSpeed.current;
        if (distanceTraveled.current > totalLength) {
          distanceTraveled.current = totalLength;
        }
        const coords = pathEl.current.getPointAtLength(distanceTraveled.current);
        circleRef.current.setLatLng([coords.x, coords.y]);
        circleRef.current.bringToFront();
  
        if (distanceTraveled.current === totalLength) {
          previousNode.current = currentNode.current;
          currentNode.current = targetNode.current;
          targetNode.current = -1;
          distanceTraveled.current = 0;
        }
      }
    }
  })
  
  return (
    <Circle ref={circleRef} center={circlePosition.current} radius={6} fillOpacity={1} fillColor="#e63946" stroke={false}></Circle>
  )
}