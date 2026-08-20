import { LotteryPeriod, LotteryCheckResult } from './types/invoice';

export const RECENT_LOTTERY_PERIODS: LotteryPeriod[] = [
  {
    period: '11307',
    year: 113,
    months: '07-08 月',
    superPrize: '38039158',
    specialPrize: '08276859',
    firstPrizes: ['32117043', '67701914', '36120539'],
    sixthPrizeAdd: ['200', '588'],
  },
  {
    period: '11305',
    year: 113,
    months: '05-06 月',
    superPrize: '86396830',
    specialPrize: '53267964',
    firstPrizes: ['39635796', '98978859', '00360480'],
    sixthPrizeAdd: ['888'],
  },
  {
    period: '11303',
    year: 113,
    months: '03-04 月',
    superPrize: '44140251',
    specialPrize: '14715309',
    firstPrizes: ['86562747', '79171152', '77925523'],
    sixthPrizeAdd: ['123'],
  },
  {
    period: '11301',
    year: 113,
    months: '01-02 月',
    superPrize: '16620962',
    specialPrize: '50008017',
    firstPrizes: ['73705743', '90315047', '10604429'],
    sixthPrizeAdd: ['456'],
  }
];

/**
 * 根據發票日期計算所屬期別 (例如 2024-08-15 -> 11307)
 */
export function getInvoicePeriod(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const ceYear = d.getFullYear();
    const rocYear = ceYear - 1911;
    const month = d.getMonth() + 1; // 1 ~ 12
    const periodMonth = month % 2 === 0 ? month - 1 : month;
    const periodMonthStr = periodMonth.toString().padStart(2, '0');
    return `${rocYear}${periodMonthStr}`;
  } catch {
    return '11307';
  }
}

/**
 * 自動核對單張台灣發票是否中獎
 * @param invoiceNumber 發票號碼 (8位數字或包含字軌，如 "AB-32117043" 或 "32117043")
 * @param invoiceDate 發票日期 (YYYY-MM-DD)
 * @param periods 開獎期別列表 (若無則使用最近期別)
 */
export function checkLotteryWinning(
  invoiceNumber: string,
  invoiceDate: string,
  periods: LotteryPeriod[] = RECENT_LOTTERY_PERIODS
): LotteryCheckResult {
  // 取出後 8 位純數字
  const cleanNumber = invoiceNumber.replace(/[^0-9]/g, '');
  if (cleanNumber.length < 8) {
    return { isWon: false, prizeName: '未中獎', prizeAmount: 0 };
  }
  const num8 = cleanNumber.slice(-8);

  const targetPeriodStr = getInvoicePeriod(invoiceDate);
  // 尋找符合期別，若無完全相符則以第一筆（最新期別）進行比對
  const period = periods.find(p => p.period === targetPeriodStr) || periods[0];
  if (!period) {
    return { isWon: false, prizeName: '未中獎', prizeAmount: 0 };
  }

  // 1. 特別獎 (8 碼全中 -> 1000 萬)
  if (num8 === period.superPrize) {
    return {
      isWon: true,
      prizeName: '特別獎',
      prizeAmount: 10000000,
      matchedNumber: num8,
      detail: `恭喜！8 碼完全相符 (${period.superPrize})，抱走 1,000 萬元！`
    };
  }

  // 2. 特獎 (8 碼全中 -> 200 萬)
  if (num8 === period.specialPrize) {
    return {
      isWon: true,
      prizeName: '特獎',
      prizeAmount: 2000000,
      matchedNumber: num8,
      detail: `恭喜！8 碼完全相符 (${period.specialPrize})，獲得 200 萬元！`
    };
  }

  // 3. 頭獎至六獎比對 (與 3 組頭獎比對)
  for (const firstPrize of period.firstPrizes) {
    if (num8 === firstPrize) {
      return {
        isWon: true,
        prizeName: '頭獎',
        prizeAmount: 200000,
        matchedNumber: num8,
        detail: `恭喜！8 碼完全相符 (${firstPrize})，獲得 20 萬元！`
      };
    }
    // 二獎：末 7 碼相同 (4 萬元)
    if (num8.slice(-7) === firstPrize.slice(-7)) {
      return {
        isWon: true,
        prizeName: '二獎',
        prizeAmount: 40000,
        matchedNumber: num8.slice(-7),
        detail: `恭喜！末 7 碼相同 (${firstPrize.slice(-7)})，獲得 4 萬元！`
      };
    }
    // 三獎：末 6 碼相同 (1 萬元)
    if (num8.slice(-6) === firstPrize.slice(-6)) {
      return {
        isWon: true,
        prizeName: '三獎',
        prizeAmount: 10000,
        matchedNumber: num8.slice(-6),
        detail: `恭喜！末 6 碼相同 (${firstPrize.slice(-6)})，獲得 1 萬元！`
      };
    }
    // 四獎：末 5 碼相同 (4,000 元)
    if (num8.slice(-5) === firstPrize.slice(-5)) {
      return {
        isWon: true,
        prizeName: '四獎',
        prizeAmount: 4000,
        matchedNumber: num8.slice(-5),
        detail: `恭喜！末 5 碼相同 (${firstPrize.slice(-5)})，獲得 4,000 元！`
      };
    }
    // 五獎：末 4 碼相同 (1,000 元)
    if (num8.slice(-4) === firstPrize.slice(-4)) {
      return {
        isWon: true,
        prizeName: '五獎',
        prizeAmount: 1000,
        matchedNumber: num8.slice(-4),
        detail: `恭喜！末 4 碼相同 (${firstPrize.slice(-4)})，獲得 1,000 元！`
      };
    }
    // 六獎：末 3 碼相同 (200 元)
    if (num8.slice(-3) === firstPrize.slice(-3)) {
      return {
        isWon: true,
        prizeName: '六獎',
        prizeAmount: 200,
        matchedNumber: num8.slice(-3),
        detail: `恭喜！末 3 碼相同 (${firstPrize.slice(-3)})，獲得 200 元！`
      };
    }
  }

  // 4. 增開六獎 (末 3 碼 -> 200 元)
  if (period.sixthPrizeAdd) {
    for (const add3 of period.sixthPrizeAdd) {
      if (num8.slice(-3) === add3) {
        return {
          isWon: true,
          prizeName: '六獎 (增開)',
          prizeAmount: 200,
          matchedNumber: add3,
          detail: `恭喜！末 3 碼符合增開獎號 (${add3})，獲得 200 元！`
        };
      }
    }
  }

  return { isWon: false, prizeName: '未中獎', prizeAmount: 0 };
}
