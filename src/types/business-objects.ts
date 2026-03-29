export interface Deal {
  id: string;
  name: string;
  stage: string;
  amount?: number;
  customerId: string;
}

export interface Customer {
  id: string;
  name: string;
  industry?: string;
  contactName?: string;
  contactPhone?: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  dealId?: string;
  customerId: string;
  duration?: number;
  recordingUrl?: string;
}
