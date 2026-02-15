import { useQuery } from '@tanstack/react-query';
import { fetchCryptoHistory, fetchEquityHistory, fetchForexHistory } from '@/services/fetcher';

export function useCryptoData(coinId: string, days: number, enabled: boolean) {
  return useQuery({
    queryKey: ['crypto', coinId, days],
    queryFn: () => fetchCryptoHistory(coinId, days),
    enabled: enabled && !!coinId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });
}

export function useEquityData(symbol: string, days: number, enabled: boolean) {
  return useQuery({
    queryKey: ['equity', symbol, days],
    queryFn: () => fetchEquityHistory(symbol, days),
    enabled: enabled && !!symbol,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });
}

export function useForexData(from: string, to: string, days: number, enabled: boolean) {
  return useQuery({
    queryKey: ['forex', from, to, days],
    queryFn: () => fetchForexHistory(from, to, days),
    enabled: enabled && !!from && !!to,
    staleTime: 60 * 60 * 1000,
    gcTime: 120 * 60 * 1000,
    retry: false,
  });
}
