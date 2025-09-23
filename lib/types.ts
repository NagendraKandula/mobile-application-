export interface Trip {
  id: string;
  blockchainId: string;
  valid: boolean;
  itinerary?: string;
  startDate?: any;
  endDate?: any;
}

export interface HighRiskZone {
  coords: [number, number];
  radius: number;
  name?: string;
}

export type RootStackParamList = {
    Home: { username: string };
    Login: any;
};

