import { LatLng, LatLngBoundsExpression, LatLngExpression } from "leaflet"

export interface OverpassQuery {
  version: number
  generator: string
  osm3s: Osm3s
  elements: Element[]
}

export interface Osm3s {
  timestamp_osm_base: string
  copyright: string
}

export interface Element {
  type: string
  id: number
  bounds: LatLngBoundsExpression
  nodes: number[]
  geometry: LatLngQuery[]
  tags: Tags
}

export interface ElementWithWeight extends Element {
  weight: number
}

export interface ElementWithCenter extends Element {
  center: LatLngQueryWithRoad
}

export interface LatLngQuery {
  lat: number,
  lon: number
}

export interface LatLngQueryWithRoad extends LatLngQuery {
  roadId: number
}

export interface Tags {
  highway?: string
  lanes?: string
  maxspeed?: string
  name?: string
  "tiger:cfcc"?: string
  "tiger:county"?: string
  "tiger:name_base"?: string
  "tiger:name_type"?: string
  "tiger:zip_left"?: string
  "tiger:zip_right"?: string
  "addr:city"?: string
  "addr:housenumber"?: string
  "addr:postcode"?: string
  "addr:state"?: string
  "addr:street"?: string
  amenity?: string
  building?: string
  religion?: string
  source?: string
  bridge?: string
  layer?: string
  waterway?: string
  landuse?: string
  surface?: string
}
