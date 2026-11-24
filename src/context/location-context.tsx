"use client";

import * as React from "react";
import { GeoLocation } from "@/types";
import { siteConfig } from "@/config/site";

interface LocationContextType {
  location: GeoLocation;
  setLocation: (loc: GeoLocation) => void;
}

const LocationContext = React.createContext<LocationContextType>({
  location: siteConfig.initialLocation,
  setLocation: () => {},
});

export function LocationProvider({
  children,
  initialLocation = siteConfig.initialLocation,
}: {
  children: React.ReactNode;
  initialLocation?: GeoLocation;
}) {
  const [location, setLocation] = React.useState<GeoLocation>(initialLocation);

  const handleSetLocation = React.useCallback((newLoc: GeoLocation) => {
    setLocation(newLoc);
  }, []);

  return (
    <LocationContext.Provider value={{ location, setLocation: handleSetLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return React.useContext(LocationContext);
}
