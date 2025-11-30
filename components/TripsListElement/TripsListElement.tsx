'use client';

import {PostsList} from "@/components/PostsList/PostsList";
import {ActivityData} from "@/components/ActivityPost/ActivityData";
import {TripData} from "@/components/TripPost/TripData";
import {TripPost} from "@/components/TripPost/TripPost";

const activities: ActivityData[] = [
  {title: "Wycieczka wgłąb torbyfdsvfdgfhdgfgdfbhdgfhdgfbhjghfj", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!", distance: "0.13 km", time: "00:00:32", average: "7.02 km/h", startDate: "2019-07-23 15:36"},
  {title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!", distance: "0.13 km", time: "00:00:32", average: "7.02 km/h", startDate: "2019-07-23 11:32"},
  {title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!", distance: "0.13 km", time: "00:00:32", average: "7.02 km/h", startDate: "2019-07-23 11:32"},
  {title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!", distance: "0.13 km", time: "00:00:32", average: "7.02 km/h", startDate: "2019-07-23 11:32"},
  {title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!", distance: "0.13 km", time: "00:00:32", average: "7.02 km/h", startDate: "2019-07-23 11:32"},
  {title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!", distance: "0.13 km", time: "00:00:32", average: "7.02 km/h", startDate: "2019-07-23 11:32"},
  {title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!", distance: "0.13 km", time: "00:00:32", average: "7.02 km/h", startDate: "2019-07-23 11:32"},
  {title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!", distance: "0.13 km", time: "00:00:32", average: "7.02 km/h", startDate: "2019-07-23 11:32"},
  {title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!", distance: "0.13 km", time: "00:00:32", average: "7.02 km/h", startDate: "2019-07-23 11:32"},
  {title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!", distance: "0.13 km", time: "00:00:32", average: "7.02 km/h", startDate: "2019-07-23 11:32"},
]

const trips: TripData[] = [
  {title: "wycieczka poranna", distance: "0.71 km", startDate: "2019-07-23 12:33", endDate: "2019-07-24 7:23", activities},
  {title: "wycieczka poranna", distance: "0.71 km", startDate: "2019-07-23 12:33", endDate: "2019-07-24 7:23", activities},
  {title: "wycieczka poranna", distance: "0.71 km", startDate: "2019-07-23 12:33", endDate: "2019-07-24 7:23", activities},
  {title: "wycieczka poranna", distance: "0.71 km", startDate: "2019-07-23 12:33", endDate: "2019-07-24 7:23", activities},
  {title: "wycieczka poranna", distance: "0.71 km", startDate: "2019-07-23 12:33", endDate: "2019-07-24 7:23", activities},
  {title: "wycieczka poranna", distance: "0.71 km", startDate: "2019-07-23 12:33", endDate: "2019-07-24 7:23", activities}
]



export function TripsListElement() {
  return (
    <>
      <PostsList Content={trips.map((trip: TripData) => (<TripPost data={trip}/>))}/>
    </>
  )
}