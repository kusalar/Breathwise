export const siteConfig = {
  name: "BreatheWise AI",
  tagline: "Air Quality & Health Companion",
  description:
    "AI-powered air quality companion for Indian cities. Track live CPCB AQI, protect your family, and build low-emission daily routines.",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://breathewise-ai-cyan.vercel.app",
  links: {
    github: "https://github.com/breathewise/breathewise-ai",
    documentation: "/docs",
  },
  initialLocation: {
    name: "Siliguri",
    region: "West Bengal",
    country: "India",
    latitude: 26.7271,
    longitude: 88.3953,
    isDemo: false,
  },
  supportedLocations: [
    { name: "Siliguri", region: "West Bengal", country: "India", latitude: 26.7271, longitude: 88.3953 },
    { name: "Delhi", region: "National Capital Region", country: "India", latitude: 28.6139, longitude: 77.209 },
    { name: "Kolkata", region: "West Bengal", country: "India", latitude: 22.5726, longitude: 88.3639 },
    { name: "Patna", region: "Bihar", country: "India", latitude: 25.5941, longitude: 85.1376 },
    { name: "Mumbai", region: "Maharashtra", country: "India", latitude: 19.076, longitude: 72.8777 },
    { name: "Bengaluru", region: "Karnataka", country: "India", latitude: 12.9716, longitude: 77.5946 },
    { name: "London", region: "England", country: "United Kingdom", latitude: 51.5074, longitude: -0.1278 },
    { name: "New York", region: "NY", country: "United States", latitude: 40.7128, longitude: -74.006 },
  ],
  navItems: [
    { label: "Home", href: "/" },
    { label: "Features", href: "/#features" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "About", href: "/#about" },
  ],
  dashboardNavItems: [
    { label: "Overview", href: "/dashboard", icon: "LayoutDashboard" },
    { label: "Air Quality", href: "/dashboard/air-quality", icon: "Wind" },
    { label: "AI Assistant", href: "/dashboard/ai-assistant", icon: "Bot" },
    { label: "Daily Planner", href: "/dashboard/daily-planner", icon: "CalendarCheck" },
    { label: "Indoor Air", href: "/dashboard/indoor-air", icon: "Home" },
    { label: "Sustainable Choices", href: "/dashboard/sustainable-choices", icon: "Leaf" },
    { label: "Family Protection", href: "/dashboard/family-protection", icon: "Users" },
    { label: "Impact Tracker", href: "/dashboard/impact-tracker", icon: "Activity" },
    { label: "Community Hub", href: "/dashboard/community", icon: "Globe2" },
    { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
  ],
};

