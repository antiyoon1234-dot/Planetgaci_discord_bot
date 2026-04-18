// src/services/itemService.js
'use strict';

const supabase = require('./supabase');

/**
 * 아이템명으로 items 테이블 조회 (부분 일치, 최대 5개)
 * @param {string} name
 * @returns {Promise<Array>}
 */
async function searchItems(name) {
  const { data, error } = await supabase
    .from('items')
    .select('id, name, current_value, last_modified, unit_type, status')
    .ilike('name', `%${name}%`)
    .eq('status', 'approved')
    .order('name', { ascending: true })
    .limit(5);

  if (error) throw new Error(`[itemService] DB 조회 오류: ${error.message}`);
  return data ?? [];
}

/**
 * 정확한 아이템명으로 단일 아이템 조회
 * @param {string} name
 * @returns {Promise<Object|null>}
 */
async function getItemByName(name) {
  const { data, error } = await supabase
    .from('items')
    .select('id, name, current_value, last_modified, unit_type')
    .eq('status', 'approved')
    .ilike('name', name)
    .limit(1)
    .maybeSingle();

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
    shulker: '샬커박스',
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
