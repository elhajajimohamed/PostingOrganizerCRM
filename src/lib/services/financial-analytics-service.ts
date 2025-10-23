import { CallCenter } from '@/lib/types/external-crm';

export interface ClientTopup {
  id: string;
  clientId: string;
  clientName: string;
  callCenterName: string;
  amountEUR: number;
  paymentMethod: 'Bank Transfer' | 'Interface Payment' | 'Payment Link' | 'Wafacash' | 'Cashplus' | 'Cash' | 'Crypto';
  date: string;
  country: 'Morocco' | 'Senegal' | 'Tunisia' | 'Cameroon' | 'Ivory Coast' | 'Guinea';
  notes?: string;
}

export interface ClientConsumption {
  clientId: string;
  clientName: string;
  totalConsumptionEUR: number;
  totalTopupEUR: number;
  paymentMethod: ClientTopup['paymentMethod'];
  lastTopupDate: string;
  country: ClientTopup['country'];
  notes?: string;
}

export interface MonthlyStats {
  monthId: string;
  totalTopupEUR: number;
  totalConsumptionEUR: number;
  totalCommissionEUR: number;
  commissionRate: number;
}

export interface FinancialReport {
  overview: {
    monthlyTarget: number;
    currentTurnover: number;
    commissionRate: number;
    commissionAmount: number;
    progressPercentage: number;
  };
  clients: ClientConsumption[];
  countryInsights: {
    country: string;
    consumption: number;
    percentage: number;
  }[];
  performance: {
    totalConsumption: number;
    estimatedMargin: number;
    averageTopupPerClient: number;
    activeClientsCount: number;
  };
  alerts: {
    clientId: string;
    clientName: string;
    daysSinceLastTopup: number;
    message: string;
  }[];
  rankings: {
    topSpender: ClientConsumption | null;
    risingClient: ClientConsumption | null;
  };
}

export class FinancialAnalyticsService {
  private static readonly MONTHLY_TARGET = 3000; // €

  private static getCommissionRate(turnover: number): number {
    if (turnover >= 20000) return 0.05; // 5%
    if (turnover >= 10000) return 0.04; // 4%
    if (turnover >= 6000) return 0.03; // 3%
    if (turnover >= 3000) return 0.03; // 3%
    return 0; // No commission below target
  }

  private static calculateCommission(turnover: number): number {
    const rate = this.getCommissionRate(turnover);
    return turnover * rate;
  }

  private static getCurrentMonthId(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private static getDaysSinceDate(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private static generateMockClientData(): ClientConsumption[] {
    const clients: ClientConsumption[] = [
      {
        clientId: '1',
        clientName: 'TechCorp Morocco',
        totalConsumptionEUR: 2500,
        totalTopupEUR: 2800,
        paymentMethod: 'Bank Transfer',
        lastTopupDate: '2024-01-15',
        country: 'Morocco',
        notes: 'Regular client, good payment history'
      },
      {
        clientId: '2',
        clientName: 'DataFlow Senegal',
        totalConsumptionEUR: 1800,
        totalTopupEUR: 2000,
        paymentMethod: 'Payment Link',
        lastTopupDate: '2024-01-10',
        country: 'Senegal',
        notes: 'Growing client'
      },
      {
        clientId: '3',
        clientName: 'CloudTech Tunisia',
        totalConsumptionEUR: 3200,
        totalTopupEUR: 3500,
        paymentMethod: 'Wafacash',
        lastTopupDate: '2024-01-12',
        country: 'Tunisia',
        notes: 'High-value client'
      },
      {
        clientId: '4',
        clientName: 'Innovate Cameroon',
        totalConsumptionEUR: 950,
        totalTopupEUR: 1000,
        paymentMethod: 'Cashplus',
        lastTopupDate: '2023-12-20',
        country: 'Cameroon',
        notes: 'Needs follow-up'
      },
      {
        clientId: '5',
        clientName: 'FutureTech Ivory Coast',
        totalConsumptionEUR: 2100,
        totalTopupEUR: 2300,
        paymentMethod: 'Crypto',
        lastTopupDate: '2024-01-08',
        country: 'Ivory Coast',
        notes: 'Crypto payments preferred'
      }
    ];

    return clients.sort((a, b) => b.totalConsumptionEUR - a.totalConsumptionEUR);
  }

  private static generateMockTopupData(): ClientTopup[] {
    return [
      {
        id: '1',
        clientId: '1',
        clientName: 'TechCorp Morocco',
        callCenterName: 'Call Center A',
        amountEUR: 500,
        paymentMethod: 'Bank Transfer',
        date: '2024-01-15',
        country: 'Morocco',
        notes: 'Monthly top-up'
      },
      {
        id: '2',
        clientId: '2',
        clientName: 'DataFlow Senegal',
        callCenterName: 'Call Center B',
        amountEUR: 300,
        paymentMethod: 'Payment Link',
        date: '2024-01-10',
        country: 'Senegal',
        notes: 'Initial payment'
      },
      {
        id: '3',
        clientId: '3',
        clientName: 'CloudTech Tunisia',
        callCenterName: 'Call Center C',
        amountEUR: 800,
        paymentMethod: 'Wafacash',
        date: '2024-01-12',
        country: 'Tunisia',
        notes: 'Large top-up'
      }
    ];
  }

  private static generateCountryInsights(clients: ClientConsumption[]): FinancialReport['countryInsights'] {
    const countryTotals = clients.reduce((acc, client) => {
      acc[client.country] = (acc[client.country] || 0) + client.totalConsumptionEUR;
      return acc;
    }, {} as Record<string, number>);

    const totalConsumption = Object.values(countryTotals).reduce((sum, amount) => sum + amount, 0);

    return Object.entries(countryTotals)
      .map(([country, consumption]) => ({
        country,
        consumption,
        percentage: totalConsumption > 0 ? (consumption / totalConsumption) * 100 : 0
      }))
      .sort((a, b) => b.consumption - a.consumption);
  }

  private static generateAlerts(clients: ClientConsumption[]): FinancialReport['alerts'] {
    return clients
      .filter(client => this.getDaysSinceDate(client.lastTopupDate) > 30)
      .map(client => ({
        clientId: client.clientId,
        clientName: client.clientName,
        daysSinceLastTopup: this.getDaysSinceDate(client.lastTopupDate),
        message: `No top-up in ${this.getDaysSinceDate(client.lastTopupDate)} days`
      }));
  }

  private static getRankings(clients: ClientConsumption[]): FinancialReport['rankings'] {
    const sortedByConsumption = [...clients].sort((a, b) => b.totalConsumptionEUR - a.totalConsumptionEUR);
    const sortedByGrowth = [...clients].sort((a, b) => b.totalTopupEUR - a.totalTopupEUR); // Simplified growth calculation

    return {
      topSpender: sortedByConsumption[0] || null,
      risingClient: sortedByGrowth[0] || null
    };
  }

  static async generateFinancialReport(callCenters: CallCenter[]): Promise<FinancialReport> {
    try {
      // Fetch real top-up data from Firebase
      const response = await fetch('/api/external-crm/top-ups');
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        // Use real data
        const topups = result.data as ClientTopup[];

        // Aggregate data by client
        const clientMap = new Map<string, ClientConsumption>();

        topups.forEach(topup => {
          const existing = clientMap.get(topup.clientId);
          if (existing) {
            existing.totalTopupEUR += topup.amountEUR;
            existing.totalConsumptionEUR += topup.amountEUR; // Assuming top-up equals consumption for now
            existing.lastTopupDate = topup.date > existing.lastTopupDate ? topup.date : existing.lastTopupDate;
          } else {
            clientMap.set(topup.clientId, {
              clientId: topup.clientId,
              clientName: topup.clientName,
              totalConsumptionEUR: topup.amountEUR,
              totalTopupEUR: topup.amountEUR,
              paymentMethod: topup.paymentMethod,
              lastTopupDate: topup.date,
              country: topup.country,
              notes: topup.notes
            });
          }
        });

        const clients = Array.from(clientMap.values());
        const currentTurnover = clients.reduce((sum, client) => sum + client.totalTopupEUR, 0);
        const commissionRate = this.getCommissionRate(currentTurnover);
        const commissionAmount = this.calculateCommission(currentTurnover);

        const totalConsumption = clients.reduce((sum, client) => sum + client.totalConsumptionEUR, 0);
        const activeClientsCount = clients.length;
        const averageTopupPerClient = activeClientsCount > 0 ? currentTurnover / activeClientsCount : 0;

        return {
          overview: {
            monthlyTarget: this.MONTHLY_TARGET,
            currentTurnover,
            commissionRate,
            commissionAmount,
            progressPercentage: Math.min((currentTurnover / this.MONTHLY_TARGET) * 100, 100)
          },
          clients,
          countryInsights: this.generateCountryInsights(clients),
          performance: {
            totalConsumption,
            estimatedMargin: commissionAmount,
            averageTopupPerClient,
            activeClientsCount
          },
          alerts: this.generateAlerts(clients),
          rankings: this.getRankings(clients)
        };
      } else {
        // Fall back to mock data if no real data exists
        const clients = this.generateMockClientData();
        const currentTurnover = clients.reduce((sum, client) => sum + client.totalTopupEUR, 0);
        const commissionRate = this.getCommissionRate(currentTurnover);
        const commissionAmount = this.calculateCommission(currentTurnover);

        const totalConsumption = clients.reduce((sum, client) => sum + client.totalConsumptionEUR, 0);
        const activeClientsCount = clients.length;
        const averageTopupPerClient = activeClientsCount > 0 ? currentTurnover / activeClientsCount : 0;

        return {
          overview: {
            monthlyTarget: this.MONTHLY_TARGET,
            currentTurnover,
            commissionRate,
            commissionAmount,
            progressPercentage: Math.min((currentTurnover / this.MONTHLY_TARGET) * 100, 100)
          },
          clients,
          countryInsights: this.generateCountryInsights(clients),
          performance: {
            totalConsumption,
            estimatedMargin: commissionAmount,
            averageTopupPerClient,
            activeClientsCount
          },
          alerts: this.generateAlerts(clients),
          rankings: this.getRankings(clients)
        };
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
      // Fall back to mock data on error
      const clients = this.generateMockClientData();
      const currentTurnover = clients.reduce((sum, client) => sum + client.totalTopupEUR, 0);
      const commissionRate = this.getCommissionRate(currentTurnover);
      const commissionAmount = this.calculateCommission(currentTurnover);

      const totalConsumption = clients.reduce((sum, client) => sum + client.totalConsumptionEUR, 0);
      const activeClientsCount = clients.length;
      const averageTopupPerClient = activeClientsCount > 0 ? currentTurnover / activeClientsCount : 0;

      return {
        overview: {
          monthlyTarget: this.MONTHLY_TARGET,
          currentTurnover,
          commissionRate,
          commissionAmount,
          progressPercentage: Math.min((currentTurnover / this.MONTHLY_TARGET) * 100, 100)
        },
        clients,
        countryInsights: this.generateCountryInsights(clients),
        performance: {
          totalConsumption,
          estimatedMargin: commissionAmount,
          averageTopupPerClient,
          activeClientsCount
        },
        alerts: this.generateAlerts(clients),
        rankings: this.getRankings(clients)
      };
    }
  }

  static convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
    // Simple conversion rates (in production, use a proper currency service)
    const rates: Record<string, number> = {
      'MAD': 0.091, // 1 MAD = 0.091 EUR
      'XOF': 0.0015, // 1 XOF = 0.0015 EUR
      'EUR': 1
    };

    if (fromCurrency === toCurrency) return amount;

    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;

    return (amount * fromRate) / toRate;
  }

  static formatCurrency(amount: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  static getPaymentMethodOptions(): ClientTopup['paymentMethod'][] {
    return ['Bank Transfer', 'Interface Payment', 'Payment Link', 'Wafacash', 'Cashplus', 'Cash', 'Crypto'];
  }

  static getCountryOptions(): ClientTopup['country'][] {
    return ['Morocco', 'Senegal', 'Tunisia', 'Cameroon', 'Ivory Coast', 'Guinea'];
  }
}