'use client';

import {Tabs} from "@mantine/core";

export function Navbar() {
  return (
    <Tabs defaultValue="map">
      <Tabs.List>
        <Tabs.Tab value="map">
          Mapa
        </Tabs.Tab>
        <Tabs.Tab value="trips">
          Wycieczki
        </Tabs.Tab>
        <Tabs.Tab value="activities">
          Aktywności
        </Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
}