import { Element } from "@/models/OverpassQuery"
import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { Polygon } from "react-leaflet"
import leaflet from 'leaflet';

type BuildingProps = {
  building: Element;
  startingBuilding: Element | null;
  destinationBuilding: Element | null;
  setStartingBuilding: Dispatch<SetStateAction<Element | null>>;
  setDestinationBuilding: Dispatch<SetStateAction<Element | null>>;
}

export default function Building({
  building,
  startingBuilding,
  destinationBuilding,
  setStartingBuilding,
  setDestinationBuilding
}: BuildingProps) {
  const buildingRef = useRef<leaflet.Polygon>(null);

  useEffect(() => {
    if (buildingRef.current) {
      if (building.id === startingBuilding?.id || building.id === destinationBuilding?.id) {
        buildingRef.current?.setStyle({ fillColor: "#4b80ea" })
      } else {
        buildingRef.current?.setStyle({ fillColor: "#dfe2e8" })
      }

      buildingRef.current.clearAllEventListeners();
      buildingRef.current.addEventListener("click", (ele) => {
        if (startingBuilding === null) {
          setStartingBuilding(prevBuilding => {
            if (prevBuilding !== null) {
              return prevBuilding;
            } else {
              return building;
            }
          });
        } else if (destinationBuilding === null) {
          setDestinationBuilding(prevBuilding => {
            if (prevBuilding !== null) {
              return prevBuilding;
            } else {
              return building;
            }
          });
        }
      })
    }
  }, [building, buildingRef, startingBuilding, destinationBuilding, setStartingBuilding, setDestinationBuilding])

  return (
    // @ts-ignore
    <Polygon ref={buildingRef} positions={building.geometry} fillColor="#dfe2e8" fillOpacity={1} color="#d2d5df" weight={1}></Polygon>
  )
}