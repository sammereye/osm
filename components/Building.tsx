import { Element, ElementWithCenter } from "@/models/OverpassQuery"
import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { Polygon } from "react-leaflet"
import leaflet from 'leaflet';

type BuildingProps = {
  building: Element;
  selectedBuilding: ElementWithCenter | null;
  startingBuilding: ElementWithCenter | null;
  destinationBuilding: ElementWithCenter | null;
  setSelectedBuilding: Dispatch<SetStateAction<ElementWithCenter | null>>;
  setStartingBuilding: Dispatch<SetStateAction<ElementWithCenter | null>>;
  setDestinationBuilding: Dispatch<SetStateAction<ElementWithCenter | null>>;
}

export default function Building({
  building,
  selectedBuilding,
  startingBuilding,
  destinationBuilding,
  setSelectedBuilding,
  setStartingBuilding,
  setDestinationBuilding
}: BuildingProps) {
  const buildingRef = useRef<leaflet.Polygon>(null);

  useEffect(() => {
    if (buildingRef.current) {
      if (building.id === selectedBuilding?.id || building.id === startingBuilding?.id || building.id === destinationBuilding?.id) {
        buildingRef.current?.setStyle({ color: "#4b80ea", weight: 4 })
      } else {
        buildingRef.current?.setStyle({ color: "#d2d5df", weight: 1 })
      }

      buildingRef.current.clearAllEventListeners();
      buildingRef.current.addEventListener("click", (ele) => {
        setSelectedBuilding({...building, center: {lat: buildingRef.current?.getCenter().lat, lon: buildingRef.current?.getCenter().lng}} as ElementWithCenter)
        
        // if (startingBuilding === null) {
        //   setStartingBuilding(prevBuilding => {
        //     if (prevBuilding !== null) {
        //       return prevBuilding;
        //     } else {
        //       return {...building, center: {lat: buildingRef.current?.getCenter().lat, lon: buildingRef.current?.getCenter().lng}} as ElementWithCenter;
        //     }
        //   });
        // } else if (destinationBuilding === null) {
        //   setDestinationBuilding(prevBuilding => {
        //     if (prevBuilding !== null) {
        //       return prevBuilding;
        //     } else {
        //       return {...building, center: {lat: buildingRef.current?.getCenter().lat, lon: buildingRef.current?.getCenter().lng}} as ElementWithCenter;
        //     }
        //   });
        // }
      })
    }
  }, [building, buildingRef, selectedBuilding, startingBuilding, destinationBuilding, setStartingBuilding, setDestinationBuilding, setSelectedBuilding])

  return (
    // @ts-ignore
    <Polygon ref={buildingRef} positions={building.geometry} fillColor="#dfe2e8" fillOpacity={1} color="#d2d5df" weight={1}></Polygon>
  )
}