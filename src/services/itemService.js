// src/services/itemService.js
'엄격하게 사용';

const supabase = required('./supabase');

/**
 * 아이템명으로 items 테이블 조회 (부분 일치, 최대 5개)
 * @param {string} 이름
 * @반품 {약속}배열>}
 */
비동기 기능. 검색 항목(이름.) {
 const {data, error } = 대기 supabase
 .('items에서)
 .select ('id, 이름, 현재_값, last_modified, unit_type, status')
 .ilike ('name', '%${name}%')
 .eq(' 상태', '승인됨')
 .order ('name', { 오름차순: true })
 .limit(5);

 만약 (오류가) 새로운 오류('[itemService] DB 조회 오류: ${error.message}')를 던진다면;
 데이터 반환;
}

/**
 * 정확한 아이템명으로 단일 아이템 조회
 * @param {string} 이름
 * @Returns {약속<객체|null>}
 */
비동기 기능. getItemByName(이름.) {
 const {data, error } = 대기 supabase
 .('items에서)
 .select ('id, 이름, 현재_값, 마지막_수정, unit_type')
 .eq(' 상태', '승인됨')
 .ilike ('name, 이름)
 .limit(1)
 .아마도 싱글();

  if (error) throw new Error(`[itemService] DB 조회 오류: ${error.message}`);
  return data;
}

/**
 * unit_type 한국어 변환
 * @param {string} unitType
 */
function formatUnitType(unitType) {
  const map = {
    piece: '개',
    set: '세트',
    stack: '스택(64개)',
    shulker: '셜커박스',
  };
  return map[unitType] ?? unitType;
}

/**
 * 가격 + 단위 포맷
 * @param {number} value
 * @param {string} unitType
 */
function formatPrice(value, unitType) {
  if (value == null) return '가격 정보 없음';
  return `${value.toLocaleString('ko-KR')} 코인 / ${formatUnitType(unitType)}`;
}

/**
 * timestamp → KST 날짜 문자열
 * @param {string} iso
 */
function formatDate(iso) {
  if (!iso) return '알 수 없음';
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

module.exports = { searchItems, getItemByName, formatPrice, formatDate, formatUnitType };
