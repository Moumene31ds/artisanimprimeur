// src/lib/b2b-types.ts
// B2B Corporate Portal Type Definitions

export interface B2BOrganization {
  id: string;
  name: string;
  tradeName?: string;
  legalForm: "SARL" | "SPA" | "EURL" | "SNC" | "Auto-entrepreneur" | "Autre";
  rc: string; // Registre de Commerce
  nif: string; // Numéro d'Identification Fiscale
  nis: string; // Numéro d'Identification Statistique
  article: string; // Article d'imposition
  address: string;
  wilaya: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl?: string;
  isTvaExempt: boolean;
  tvaNumber?: string;
  creditLimit: number; // Plafond de crédit accordé
  currentCreditBalance: number; // Solde courant
  status: "pending_verification" | "active" | "suspended";
  createdAt: any;
  updatedAt: any;
}

export interface B2BBranch {
  id: string;
  orgId: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  managerUserId: string;
  managerName: string;
  managerEmail: string;
  monthlyBudget: number;
  spentThisMonth: number;
  active: boolean;
  createdAt: any;
}

export interface B2BOrderApproval {
  orderId: string;
  orgId: string;
  branchId?: string;
  branchName?: string;
  requestedByUserId: string;
  requestedByName: string;
  total: number;
  itemsCount: number;
  itemsSummary: string;
  status: "pending_approval" | "approved" | "rejected";
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: any;
  rejectionReason?: string;
  createdAt: any;
}

export interface B2BQuoteItem {
  description: string;
  quantity: number;
  unitPriceHt: number;
  totalHt: number;
}

export interface B2BQuote {
  id: string;
  quoteNumber: string;
  orgId?: string;
  clientName: string;
  clientCompany?: string;
  clientAddress?: string;
  clientNif?: string;
  clientNis?: string;
  clientRc?: string;
  items: B2BQuoteItem[];
  subtotalHt: number;
  tvaRate: number; // 0 or 19%
  tvaAmount: number;
  totalTtc: number;
  validityDays: number;
  issuedAt: any;
  expiresAt: any;
  status: "draft" | "sent" | "approved" | "rejected";
  notes?: string;
}
