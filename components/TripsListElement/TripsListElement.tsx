'use client';

import {PostsList} from "@/components/PostsList/PostsList";
import {TripData} from "@/components/TripPost/TripData";
import {TripPost} from "@/components/TripPost/TripPost";


const trips: TripData[] = [
  {title: "wycieczka poranna", distance: "0.71 km", activities: ["kibel", "karton", "kuchnia", "ryj człowieka"]}
]



export function TripsListElement() {
  return (
    <>
      <PostsList Content={trips.map((trip: TripData) => (<TripPost data={trip}/>))}/>
    </>
  )
}