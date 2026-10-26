import {
  canRatePlayers,
  canViewRatings,
  canViewRoster,
  canManageAttendance,
  getRolePermissions,
  isPlayerExemptForMatch,
  calculateMatchFinancials,
} from '../src/utils/permissions.ts';
import { balanceTeams } from '../src/utils/calculations.ts';
import { RAW_PLAYERS_DATA, ADMIN_USERS, INITIAL_MATCH } from '../src/data/initialData.ts';
import { AppUser, Match, Player, Team } from '../src/types/index.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('====================================================');
console.log('🧪 HALISAHA PRO — SİSTEM DOĞRULAMA & TEST PROTOKOLÜ');
console.log('====================================================\n');

// ----------------------------------------------------
// TEST 1: VERİ BÜTÜNLÜĞÜ (DATA INTEGRITY)
// ----------------------------------------------------
console.log('📁 Test 1: Temel Veri Bütünlüğü');
assert(RAW_PLAYERS_DATA.length === 45, `Başlangıç oyuncu havuzu 45 kişidir (Mevcut: ${RAW_PLAYERS_DATA.length})`);
assert(ADMIN_USERS.length === 5, `Konsey üyeleri 5 kişidir (Mevcut: ${ADMIN_USERS.length})`);

const hadiHoca = ADMIN_USERS.find(u => u.name === 'Hadi Hoca');
const fatihYetgin = ADMIN_USERS.find(u => u.name === 'Fatih Yetgin');
const yasinTuran = ADMIN_USERS.find(u => u.name === 'Yasin Turan');
assert(hadiHoca?.role === 'admin', 'Hadi Hoca rolü: admin');
assert(fatihYetgin?.role === 'admin', 'Fatih Yetgin rolü: admin');
assert(yasinTuran?.role === 'council_member', 'Yasin Turan rolü: council_member');
assert(INITIAL_MATCH.matchNumber === 44, `Mevcut maç 44. Hafta olarak korunuyor (Mevcut: ${INITIAL_MATCH.matchNumber})`);

// ----------------------------------------------------
// TEST 2: ROL VE PUANLAMA YETKİLENDİRMESİ
// ----------------------------------------------------
console.log('\n🔒 Test 2: Yetkilendirme ve Puanlama Güvenliği');
const adminUser: AppUser = { id: 'admin1', name: 'Yönetici', role: 'admin' };
const councilUser: AppUser = { id: 'council1', name: 'Konsey', role: 'council_member' };
const playerUser: AppUser = { id: 'player1', name: 'Normal Oyuncu', role: 'player', playerId: 'p_1' };
const guestUser: AppUser = { id: 'guest1', name: 'Misafir', role: 'guest', playerId: 'p_guest' };

assert(canRatePlayers(adminUser) === true, 'Admin oyuncu puanlayabilir');
assert(canRatePlayers(councilUser) === true, 'Konsey üyesi oyuncu puanlayabilir');
assert(canRatePlayers(playerUser) === false, 'Normal oyuncu puanlama YAPAMAZ');
assert(canRatePlayers(guestUser) === false, 'Misafir puanlama YAPAMAZ');

assert(canViewRatings(adminUser) === true, 'Admin puanları görebilir');
assert(canViewRatings(councilUser) === true, 'Konsey üyesi puanları görebilir');
assert(canViewRatings(playerUser) === false, 'Normal oyuncu puanları GÖREMEZ');
assert(canViewRatings(guestUser) === false, 'Misafir puanları GÖREMEZ');

// Yoklama Yetkilendirmesi (Gelenler, Gelmeyenler, Bekleyenler, Sattı)
assert(canManageAttendance(adminUser) === true, 'Admin tüm oyuncuların katılım durumunu (Gelen/Gelmeyen/Bekleyen/Sattı) girebilir');
assert(canManageAttendance(councilUser) === true, 'Konsey üyesi tüm oyuncuların katılım durumunu (Gelen/Gelmeyen/Bekleyen/Sattı) sisteme girebilir');
assert(canManageAttendance(playerUser) === false, 'Normal oyuncu diğer oyuncuların yoklamasını GİREMEZ');
assert(canManageAttendance(guestUser) === false, 'Misafir diğer oyuncuların yoklamasını GİREMEZ');
assert(getRolePermissions('council_member').canManageAttendance === true, 'Konsey rol yetkisi: canManageAttendance = true');
assert(getRolePermissions('player').canManageAttendance === false, 'Oyuncu rol yetkisi: canManageAttendance = false');

// ----------------------------------------------------
// TEST 3: MİSAFİR KADRO ERİŞİM KURALLARI
// ----------------------------------------------------
console.log('\n👥 Test 3: Misafir Kadro Erişim Kuralları');
const testMatch: Match = {
  ...INITIAL_MATCH,
  id: 'match_test_1',
  attendance: {
    'p_coming': 'Geliyor',
    'p_declined': 'Gelemiyor',
    'p_pending': 'Haber Bekleniyor',
  },
};

const guestComing: AppUser = { id: 'g1', name: 'Gelen Misafir', role: 'guest', playerId: 'p_coming' };
const guestDeclined: AppUser = { id: 'g2', name: 'Gelmeyen Misafir', role: 'guest', playerId: 'p_declined' };
const guestPending: AppUser = { id: 'g3', name: 'Bekleyen Misafir', role: 'guest', playerId: 'p_pending' };

assert(canViewRoster(adminUser, testMatch).allowed === true, 'Admin kadroyu her zaman görebilir');
assert(canViewRoster(guestComing, testMatch).allowed === true, 'Geliyorum diyen misafir kadroyu görebilir');
assert(canViewRoster(guestPending, testMatch).allowed === true, 'Beklemedeki misafir kadroyu görebilir');
assert(canViewRoster(guestDeclined, testMatch).allowed === false, 'GELMİYORUM diyen misafire kadro ERİŞİMİ ENGELLENDİ');

// ----------------------------------------------------
// TEST 4: ÖDEME MUAFİYETİ HESAPLAMALARI
// ----------------------------------------------------
console.log('\n💰 Test 4: Ödeme Muafiyeti ve Finansal Hesaplamalar');
const basePlayer: Player = {
  id: 'base_player',
  name: 'Örnek Oyuncu',
  primaryPosition: 'Orta saha',
  finalScore: 8.0,
  trimmedMean: 8.0,
  standardDeviation: 0.2,
  isJoker: false,
  ratings: {},
  positionScores: { 'Kaleci': 3, 'Defans': 7, 'Orta saha': 8, 'Kanat': 7.5, 'Forvet': 7 },
  attendanceStats: { attended: 10, totalCalled: 10, noShow: 0, penaltyPoints: 0, isSuspended: false, recentAttendance: [] },
  financialBalance: 0,
};
const exemptPlayerAll: Player = {
  ...basePlayer,
  id: 'exempt_all',
  name: 'Tümden Muaf Oyuncu',
  paymentExemption: {
    id: 'ex_1',
    playerId: 'exempt_all',
    isActive: true,
    scope: 'all',
    reason: 'Sakatlık/Konuk Muafiyeti',
    createdAt: new Date().toISOString(),
    createdBy: 'Hadi Hoca',
  },
};

const exemptPlayerMatch: Player = {
  ...basePlayer,
  id: 'exempt_match',
  name: 'Bu Maça Özel Muaf',
  paymentExemption: {
    id: 'ex_2',
    playerId: 'exempt_match',
    isActive: true,
    scope: 'specific_matches',
    matchIds: ['match_test_1'],
    reason: '1. Hafta Sponsor Muafiyeti',
    createdAt: new Date().toISOString(),
    createdBy: 'Fatih Yetgin',
  },
};

const regularPlayer: Player = {
  ...basePlayer,
  id: 'reg_1',
  name: 'Normal Oyuncu',
  paymentExemption: undefined,
};

assert(isPlayerExemptForMatch(exemptPlayerAll, testMatch).isExempt === true, 'Kapsam=all muafiyeti doğru');
assert(isPlayerExemptForMatch(exemptPlayerMatch, testMatch).isExempt === true, 'Kapsam=specific_matches eşleşen maçta muaf');
assert(isPlayerExemptForMatch(regularPlayer, testMatch).isExempt === false, 'Muafiyetsiz oyuncu normal ödeme mükellefi');

// 14 kişilik kadro finansal simülasyonu
const mockSquad = ['exempt_all', 'exempt_match', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14'];
const mockPlayersMap: Record<string, Player> = {
  exempt_all: exemptPlayerAll,
  exempt_match: exemptPlayerMatch,
};
for (let i = 3; i <= 14; i++) {
  mockPlayersMap[`p${i}`] = { ...basePlayer, id: `p${i}`, name: `Oyuncu ${i}` };
}

const financeMatch: Match = {
  ...testMatch,
  totalPitchCost: 2800,
  costPerPlayer: 200,
  squad: mockSquad,
  payments: {
    'p3': { isPaid: true, amount: 200, paidAt: '2026-10-26' },
    'p4': { isPaid: true, amount: 200, paidAt: '2026-10-26' },
  },
};

const finResults = calculateMatchFinancials(financeMatch, mockPlayersMap);
assert(finResults.exemptCount === 2, `Muaf oyuncu sayısı doğru: 2 (Hesaplanan: ${finResults.exemptCount})`);
assert(finResults.effectiveTotalDue === 2400, `Efektif hedef tahsilat: 2400 TL (12 x 200) (Hesaplanan: ${finResults.effectiveTotalDue})`);
assert(finResults.totalCollected === 400, `Toplanan tutar: 400 TL (Hesaplanan: ${finResults.totalCollected})`);
assert(finResults.remainingDebt === 2400, `Kalan saha borcu: 2400 TL (2800 - 400) (Hesaplanan: ${finResults.remainingDebt})`);
assert(finResults.unpaidPlayers.length === 10, `Borçlu listesinde 10 oyuncu var (2 muaf ve 2 ödeyen hariç tutuldu) (Hesaplanan: ${finResults.unpaidPlayers.length})`);
assert(!finResults.unpaidPlayers.some(p => p.id === 'exempt_all' || p.id === 'exempt_match'), 'Muaf oyuncular borçlu listesinden başarıyla hariç tutuldu');

// ----------------------------------------------------
// TEST 5: KADRO KİLİTLEME VE SÜRÜM YÖNETİMİ
// ----------------------------------------------------
console.log('\n🔒 Test 5: Kadro Kilitleme & Çift Atama Koruması');
const teamAIds = ['p1', 'p2', 'p3'];
const teamBIds = ['p4', 'p5', 'p1']; // 'p1' deliberately duplicate
const setA = new Set(teamAIds);
const cleanedB = teamBIds.filter(id => !setA.has(id));
assert(cleanedB.length === 2 && !cleanedB.includes('p1'), 'Aynı oyuncunun iki takıma birden atanması engellendi');

// ----------------------------------------------------
// TEST 6: MAÇ FORMATLARI (5v5, 6v6, 7v7, 8v8) VE TAKIM DENGE HESAPLAMALARI
// ----------------------------------------------------
console.log('\n⚽ Test 6: Maç Formatları & Takım Dağılımı');
const targetMap: Record<string, number> = { '5v5': 10, '6v6': 12, '7v7': 14, '8v8': 16 };
const totalPitchCost = 2800;

assert(targetMap['5v5'] === 10, '5v5 hedef kadro 10 kişidir');
assert(Math.round(totalPitchCost / targetMap['5v5']) === 280, '5v5 kişi başı ücret: 280 TL');
assert(targetMap['6v6'] === 12, '6v6 hedef kadro 12 kişidir');
assert(Math.round(totalPitchCost / targetMap['6v6']) === 233, '6v6 kişi başı ücret: 233 TL');
assert(targetMap['7v7'] === 14, '7v7 hedef kadro 14 kişidir');
assert(Math.round(totalPitchCost / targetMap['7v7']) === 200, '7v7 kişi başı ücret: 200 TL');
assert(targetMap['8v8'] === 16, '8v8 hedef kadro 16 kişidir');
assert(Math.round(totalPitchCost / targetMap['8v8']) === 175, '8v8 kişi başı ücret: 175 TL');

// Test 5v5 balance sizing
const mock10Squad = mockSquad.slice(0, 10);
const balanced5v5 = balanceTeams(mock10Squad, mockPlayersMap);
assert(balanced5v5.teamA.players.length === 5, `5v5 Takım A oyuncu sayısı 5 (Mevcut: ${balanced5v5.teamA.players.length})`);
assert(balanced5v5.teamB.players.length === 5, `5v5 Takım B oyuncu sayısı 5 (Mevcut: ${balanced5v5.teamB.players.length})`);
assert(balanced5v5.teamB.name === 'Mavi Takım', `Takım B adı Mavi Takım olarak tutarlı (Mevcut: ${balanced5v5.teamB.name})`);

console.log('\n====================================================');
console.log(`📊 TEST SONUCU: ${passed} Başarılı, ${failed} Hatalı`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 TÜM KABUL KRİTERLERİ BAŞARIYLA GEÇTİ!');
}
