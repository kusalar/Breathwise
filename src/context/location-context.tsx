"use client";

import * as React from "react";
import { GeoLocation } from "@/types";
import { siteConfig } from "@/config/site";

interface LocationContextType {
  location: GeoLocation;
  setLocation: (loc: GeoLocation) => void;
  defaultLocation: GeoLocation;
  setDefaultLocation: (loc: GeoLocation) => void;
  userName: string;
  setUserName: (name: string) => void;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
}

const LocationContext = React.createContext<LocationContextType>({
  location: siteConfig.initialLocation,
  setLocation: () => {},
  defaultLocation: siteConfig.initialLocation,
  setDefaultLocation: () => {},
  userName: "",
  setUserName: () => {},
  isOnboardingOpen: false,
  setIsOnboardingOpen: () => {},
});

export function LocationProvider({
  children,
  initialLocation = siteConfig.initialLocation,
}: {
  children: React.ReactNode;
  initialLocation?: GeoLocation;
}) {
  const [location, setLocation] = React.useState<GeoLocation>(initialLocation);
  const [defaultLocation, setDefaultLocationState] = React.useState<GeoLocation>(initialLocation);
  const [userName, setUserNameState] = React.useState<string>("");
  const [isOnboardingOpen, setIsOnboardingOpen] = React.useState<boolean>(false);

  // Read saved preferences on client mount
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    let savedName = localStorage.getItem("breathewise_user_name") || "";
    const savedLocRaw = localStorage.getItem("breathewise_preferred_location");
    const completed = localStorage.getItem("breathewise_onboarding_completed");

    if (savedLocRaw) {
      try {
        const parsedLoc = JSON.parse(savedLocRaw) as GeoLocation;
        if (parsedLoc && parsedLoc.name && parsedLoc.latitude) {
          setDefaultLocationState(parsedLoc);
          setLocation(parsedLoc);
        }
      } catch {
        // Ignore parse error
      }
    }

    // Attempt to pull user profile from session if name is not set
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user) {
          if (!savedName && data.user.fullName) {
            savedName = data.user.fullName;
            setUserNameState(savedName);
            localStorage.setItem("breathewise_user_name", savedName);
          }
        }
        // If onboarding was never completed and we don't have a saved preferred location, prompt the user!
        if (completed !== "true" && !savedLocRaw) {
          setIsOnboardingOpen(true);
        }
      })
      .catch(() => {
        if (completed !== "true" && !savedLocRaw) {
          setIsOnboardingOpen(true);
        }
      });

    if (savedName) {
      setUserNameState(savedName);
    }
  }, []);

  const handleSetLocation = React.useCallback((newLoc: GeoLocation) => {
    setLocation(newLoc);
  }, []);

  const handleSetDefaultLocation = React.useCallback((newLoc: GeoLocation) => {
    setDefaultLocationState(newLoc);
    setLocation(newLoc);
    if (typeof window !== "undefined") {
      localStorage.setItem("breathewise_preferred_location", JSON.stringify(newLoc));
    }
  }, []);

  const handleSetUserName = React.useCallback((name: string) => {
    setUserNameState(name);
    if (typeof window !== "undefined") {
      localStorage.setItem("breathewise_user_name", name);
    }
  }, []);

  return (
    <LocationContext.Provider
      value={{
        location,
        setLocation: handleSetLocation,
        defaultLocation,
        setDefaultLocation: handleSetDefaultLocation,
        userName,
        setUserName: handleSetUserName,
        isOnboardingOpen,
        setIsOnboardingOpen,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return React.useContext(LocationContext);
}
