'use client';

import {PostsList} from "@/components/PostsList/PostsList";
import {ActivityData} from "@/components/ActivityPost/ActivityData";
import {TripData} from "@/components/TripPost/TripData";
import {TripPost} from "@/components/TripPost/TripPost";

const activities: ActivityData[] = [
  {title: "Wycieczka wgłąb torbyfdsvfdgfhdgfgdfbhdgfhdgfbhjghfj", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!", distance: "0.13 km", time: "00:00:32", average: "7.02 km/h", startDate: "2019-07-23"},
  {title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!", distance: "0.13 km", time: "00:00:32", average: "7.02 km/h", startDate: "2019-07-23"},
  {title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!", distance: "0.13 km", time: "00:00:32", average: "7.02 km/h", startDate: "2019-07-23"},
  {title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!", distance: "0.13 km", time: "00:00:32", average: "7.02 km/h", startDate: "2019-07-23"},
  {title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!", distance: "0.13 km", time: "00:00:32", average: "7.02 km/h", startDate: "2019-07-23"},
  {title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!", distance: "0.13 km", time: "00:00:32", average: "7.02 km/h", startDate: "2019-07-23"},
  {title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!", distance: "0.13 km", time: "00:00:32", average: "7.02 km/h", startDate: "2019-07-23"},
  {title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!", distance: "0.13 km", time: "00:00:32", average: "7.02 km/h", startDate: "2019-07-23"},
  {title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!", distance: "0.13 km", time: "00:00:32", average: "7.02 km/h", startDate: "2019-07-23"},
  {title: "Wycieczka wgłąb torby", desc: "Wycieczka wgłąb papierowej torby co w niej znajdziemy????? ja obstawiam że będzie tam kocimiętka!", distance: "0.13 km", time: "00:00:32", average: "7.02 km/h", startDate: "2019-07-23"},
]

const trips: TripData[] = [
  {title: "wycieczka poranna", distance: "0.71 km", startDate: "2019-07-23", endDate: "2019-07-24", activities},
  {title: "wycieczka poranna", distance: "0.71 km", startDate: "2019-07-23", endDate: "2019-07-24", activities},
  {title: "wycieczka poranna", distance: "0.71 km", startDate: "2019-07-23", endDate: "2019-07-24", activities},
  {title: "wycieczka poranna", distance: "0.71 km", startDate: "2019-07-23", endDate: "2019-07-24", activities},
  {title: "wycieczka poranna", distance: "0.71 km", startDate: "2019-07-23", endDate: "2019-07-24", activities},
  {title: "wycieczka poranna", distance: "0.71 km", startDate: "2019-07-23", endDate: "2019-07-24", activities}
]



export function TripsListElement() {
  return (
    <>
      <PostsList Content={trips.map((trip: TripData) => (<TripPost data={trip} width={800}/>))}/>
    </>
  )
}