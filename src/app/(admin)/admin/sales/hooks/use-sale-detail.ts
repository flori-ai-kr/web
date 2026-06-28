'use client';

import {useEffect, useState} from 'react';

import {getPhotoCardBySaleId} from '@/lib/actions/photo-cards';
import {getReservationsForSale} from '@/lib/actions/reservations';
import type {PhotoCard, Reservation, Sale} from '@/types/database';

/**
 * 매출 상세 다이얼로그 선택 + 연결 사진/예약 로드 + URL saleId 딥링크 자동 오픈. sales-client에서 이동.
 */
export function useSaleDetail({ initialSelectedSale }: { initialSelectedSale?: Sale | null }) {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(initialSelectedSale || null);
  const [selectedSalePhotos, setSelectedSalePhotos] = useState<PhotoCard | null>(null);
  const [selectedSaleReservations, setSelectedSaleReservations] = useState<Reservation[]>([]);

  // URL saleId로 직접 열린 경우 photos/reservations 로드
  useEffect(() => {
    if (initialSelectedSale) {
      Promise.all([
        getPhotoCardBySaleId(initialSelectedSale.id),
        getReservationsForSale(initialSelectedSale.id),
      ]).then(([photoCard, reservations]) => {
        setSelectedSalePhotos(photoCard);
        setSelectedSaleReservations(reservations);
      });
    }
  }, [initialSelectedSale]);

  // 매출 상세 선택 시 사진 + 연결 예약 로드
  const handleSelectSale = async (sale: Sale) => {
    setSelectedSale(sale);
    setSelectedSalePhotos(null);
    setSelectedSaleReservations([]);
    const [photoCard, reservations] = await Promise.all([
      getPhotoCardBySaleId(sale.id),
      getReservationsForSale(sale.id),
    ]);
    setSelectedSalePhotos(photoCard);
    setSelectedSaleReservations(reservations);
  };

  return {
    selectedSale,
    setSelectedSale,
    selectedSalePhotos,
    selectedSaleReservations,
    handleSelectSale,
  };
}
