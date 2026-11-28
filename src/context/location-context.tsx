"use client";

import * as React from "react";
import { useStoredState, useStoredString } from "@/hooks/use-stored-state";
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
  const [storedDefaultLocation, setStoredDefaultLocation] = useStoredState<GeoLocation>(
    "breathewise_preferred_location",
    initialLocation
  );
  const [manualLocation, setManualLocation] = React.useState<{
    forDefault: GeoLocation;
    loc: GeoLocation;
  } | null>(null);
  const [userName, setUserNameState] = useStoredString("breathewise_user_name", "");
  const [isOnboardingOpen, setIsOnboardingOpen] = React.useState<boolean>(false);

  const defaultLocation =
    storedDefaultLocation && storedDefaultLocation.name && storedDefaultLocation.latitude
      ? storedDefaultLocation
      : initialLocation;
  const location =
    manualLocation && manualLocation.forDefault === defaultLocation
      ? manualLocation.loc
      : defaultLocation;

  // Hydrate user display name from active server session if available
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    const savedName = localStorage.getItem("breathewise_user_name") || "";
    const savedLocRaw = localStorage.getItem("breathewise_preferred_location");
    const completed = localStorage.getItem("breathewise_onboarding_completed");

    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.authenticated && data.user && !savedName && data.user.fullName) {
          setUserNameState(data.user.fullName);
        }
        // If onboarding was never completed and we don't have a saved preferred location, prompt the user
        if (completed !== "true" && !savedLocRaw) {
          setIsOnboardingOpen(true);
        }
      })
      .catch(() => {
        if (!cancelled && completed !== "true" && !savedLocRaw) {
          setIsOnboardingOpen(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setUserNameState]);

  const handleSetLocation = React.useCallback(
    (newLoc: GeoLocation) => {
      setManualLocation({ forDefault: defaultLocation, loc: newLoc });
    },
    [defaultLocation]
  );

  const handleSetDefaultLocation = React.useCallback(
    (newLoc: GeoLocation) => {
      setManualLocation(null);
      setStoredDefaultLocation(newLoc);
    },
    [setStoredDefaultLocation]
  );

  const handleSetUserName = React.useCallback(
    (name: string) => {
      setUserNameState(name);
    },
    [setUserNameState]
  );

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
