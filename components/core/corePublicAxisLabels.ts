import type { AxisKey } from '../../lib/m55/coreResult/types';

/** 本文・見出し用の正式名称（無料 /core 表示専用） */
export const AXIS_FORMAL_JA: Record<AxisKey, string> = {
  socialEnergy: '人との距離感',
  stability: '感受性',
  openness: '発想の広さ',
  cooperation: '協調性',
  structure: '段取り力',
};

/** レーダー周辺の短縮ラベル */
export const AXIS_SHORT_JA: Record<AxisKey, string> = {
  socialEnergy: '人との距離',
  stability: '感受性',
  openness: '発想',
  cooperation: '協調',
  structure: '段取り',
};
