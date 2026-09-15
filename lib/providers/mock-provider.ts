import type {
  BusinessSearchQuery,
  NormalizedBusiness,
  ProviderName,
} from "@/types";
import type { BusinessSearchProvider } from "./business-search-provider";

const mockBusinesses: Omit<NormalizedBusiness, "id" | "provider" | "providerBusinessId">[] = [
  {
    name: "Smile Dental Clinic",
    category: "Dental clinic",
    address: "Banjara Hills, Road No 12, Hyderabad",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    latitude: 17.4126,
    longitude: 78.4392,
    phone: "+91 98765 43210",
    email: null,
    website: null,
    rating: 4.7,
    reviewCount: 186,
    googleMapsUrl: "https://maps.google.com/?q=smile+dental+hyderabad",
    openingHours: null,
    socialLinks: null,
    metadata: {},
  },
  {
    name: "Care Dental Care",
    category: "Dental clinic",
    address: "Kondapur, Hyderabad",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    latitude: 17.4615,
    longitude: 78.3668,
    phone: "+91 98123 45678",
    email: "care@dentalcare.in",
    website: null,
    rating: 4.5,
    reviewCount: 92,
    googleMapsUrl: "https://maps.google.com/?q=care+dental+kondapur",
    openingHours: null,
    socialLinks: null,
    metadata: {},
  },
  {
    name: "BrightSmile Dentistry",
    category: "Dental clinic",
    address: "Gachibowli, Hyderabad",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    latitude: 17.4401,
    longitude: 78.3489,
    phone: null,
    email: null,
    website: null,
    rating: 4.3,
    reviewCount: 67,
    googleMapsUrl: "https://maps.google.com/?q=brightsmile+gachibowli",
    openingHours: null,
    socialLinks: null,
    metadata: {},
  },
  {
    name: "Hyderabad Family Dental",
    category: "Dental clinic",
    address: "Madhapur, Hyderabad",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    latitude: 17.4483,
    longitude: 78.3915,
    phone: "+91 90000 12345",
    email: "info@hydfamilydental.com",
    website: "https://hydfamilydental.com",
    rating: 4.8,
    reviewCount: 245,
    googleMapsUrl: "https://maps.google.com/?q=hyderabad+family+dental",
    openingHours: null,
    socialLinks: null,
    metadata: {},
  },
  {
    name: "Perfect Teeth Clinic",
    category: "Dental clinic",
    address: "Ameerpet, Hyderabad",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    latitude: 17.4374,
    longitude: 78.4487,
    phone: "+91 91234 56789",
    email: null,
    website: null,
    rating: 4.1,
    reviewCount: 34,
    googleMapsUrl: "https://maps.google.com/?q=perfect+teeth+ameerpet",
    openingHours: null,
    socialLinks: null,
    metadata: {},
  },
  {
    name: "City Dental Hospital",
    category: "Dental clinic",
    address: "Secunderabad, Hyderabad",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    latitude: 17.4606,
    longitude: 78.4987,
    phone: "+91 80000 67890",
    email: "contact@citydental.in",
    website: null,
    rating: 4.6,
    reviewCount: 128,
    googleMapsUrl: "https://maps.google.com/?q=city+dental+secunderabad",
    openingHours: null,
    socialLinks: null,
    metadata: {},
  },
  {
    name: "Elite Orthodontics",
    category: "Dental clinic",
    address: "Jubilee Hills, Hyderabad",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    latitude: 17.4239,
    longitude: 78.4083,
    phone: "+91 97000 11111",
    email: null,
    website: null,
    rating: 4.4,
    reviewCount: 56,
    googleMapsUrl: "https://maps.google.com/?q=elite+orthodontics+jubilee",
    openingHours: null,
    socialLinks: null,
    metadata: {},
  },
  {
    name: "Healthy Smiles Dental",
    category: "Dental clinic",
    address: "Kukatpally, Hyderabad",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    latitude: 17.4849,
    longitude: 78.4138,
    phone: "+91 95000 22222",
    email: "healthy@smilesdental.in",
    website: "https://smilesdental.in",
    rating: 4.2,
    reviewCount: 78,
    googleMapsUrl: "https://maps.google.com/?q=healthy+smiles+kukatpally",
    openingHours: null,
    socialLinks: null,
    metadata: {},
  },
  {
    name: "Rainbow Kids Dental",
    category: "Dental clinic",
    address: "Hitech City, Hyderabad",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    latitude: 17.4435,
    longitude: 78.3772,
    phone: null,
    email: null,
    website: null,
    rating: 4.9,
    reviewCount: 210,
    googleMapsUrl: "https://maps.google.com/?q=rainbow+kids+dental+hitech",
    openingHours: null,
    socialLinks: null,
    metadata: {},
  },
  {
    name: "Apollo Dental Care",
    category: "Dental clinic",
    address: "Begumpet, Hyderabad",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    latitude: 17.4434,
    longitude: 78.4598,
    phone: "+91 96000 33333",
    email: "apollo@dentalcare.in",
    website: null,
    rating: 4.5,
    reviewCount: 143,
    googleMapsUrl: "https://maps.google.com/?q=apollo+dental+begumpet",
    openingHours: null,
    socialLinks: null,
    metadata: {},
  },
];

export class MockBusinessSearchProvider implements BusinessSearchProvider {
  readonly name: ProviderName = "mock";

  async searchBusinesses(query: BusinessSearchQuery): Promise<NormalizedBusiness[]> {
    await delay(1500);

    let results = mockBusinesses.map((b, i) => ({
      ...b,
      id: `mock-${i + 1}`,
      provider: "mock" as const,
      providerBusinessId: `mock-${i + 1}`,
    }));

    if (query.websiteCondition === "MISSING") {
      results = results.filter((b) => !b.website);
    } else if (query.websiteCondition === "PRESENT") {
      results = results.filter((b) => b.website);
    }

    if (query.minRating !== null) {
      const minRating = query.minRating;
      results = results.filter((b) => b.rating !== null && b.rating >= minRating);
    }

    if (query.minReviews !== null) {
      const minReviews = query.minReviews;
      results = results.filter((b) => b.reviewCount !== null && b.reviewCount >= minReviews);
    }

    if (query.phoneRequired) {
      results = results.filter((b) => b.phone);
    }

    if (query.emailRequired) {
      results = results.filter((b) => b.email);
    }

    return results.slice(0, query.resultLimit);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
