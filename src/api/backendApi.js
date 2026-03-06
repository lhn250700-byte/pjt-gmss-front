/**
 * Spring 백엔드 API 클라이언트 (axios 연동)
 * - 게시판(BBS), 리뷰, 민감키워드/위험게시물, 활동내역
 * - 로그인 연동 전에는 X-User-Id를 'anonymous' 또는 개발용 ID로 전달
 * - 백엔드 주소: .env에 VITE_BACKEND_URL 설정 (기본값 http://localhost:8080)
 */

import axiosInstance, { BACKEND_BASE, getHeaders } from './axiosInstance.js';

async function request(method, path, options = {}) {
  const { body, userId } = options;
  const config = {
    method,
    url: path.startsWith('http') ? path : path,
    headers: getHeaders(userId),
    ...(body != null && { data: body }),
  };
  const res = await axiosInstance.request(config);
  return res.data;
}

// ========== 게시판 (BBS) ==========
export const bbsApi = {
  /** 목록 (페이징, 분류) */
  getList(params = {}) {
    const { page = 1, limit = 10, bbs_div, del_yn = 'N' } = params;
    const q = new URLSearchParams({ page, limit, del_yn });
    if (bbs_div) q.set('bbs_div', bbs_div);
    return request('GET', `/api/bbs?${q}`);
  },

  /** 상세 */
  getById(id) {
    return request('GET', `/api/bbs/${id}`);
  },

  /** 작성 (body: bbs_div, mbti, title, content, imgName, imgUrl, memberId 등) */
  create(body, userId) {
    return request('POST', '/api/bbs', { body, userId });
  },

  /** 수정 */
  update(id, body, userId) {
    return request('PUT', `/api/bbs/${id}`, { body, userId });
  },

  /** 삭제 */
  delete(id, userId) {
    return request('DELETE', `/api/bbs/${id}`, { userId });
  },

  /** 실시간 인기글 */
  getPopularRealtime() {
    return request('GET', '/api/bbs/popular/realtime');
  },

  /** 주간 인기글 */
  getPopularWeekly() {
    return request('GET', '/api/bbs/popular/weekly');
  },

  /** 댓글 목록 */
  getComments(bbsId) {
    return request('GET', `/api/bbs/${bbsId}/comments`);
  },

  /** 댓글 작성 */
  addComment(bbsId, body, userId) {
    return request('POST', `/api/bbs/${bbsId}/comments`, { body, userId });
  },

  /** 댓글 삭제 */
  deleteComment(cmtId, userId) {
    return request('DELETE', `/api/bbs/comments/${cmtId}`, { userId });
  },

  /** 좋아요/싫어요 토글 */
  toggleLike(bbsId, body, userId) {
    return request('POST', `/api/bbs/${bbsId}/like`, { body, userId });
  },

  /** 좋아요/싫어요 개수 */
  getLikeCounts(bbsId) {
    return request('GET', `/api/bbs/${bbsId}/like-counts`);
  },
};

// ========== 위험 게시물 (Risks) ==========
export const risksApi = {
  getList(params = {}) {
    const { page = 1, limit = 20 } = params;
    return request('GET', `/api/risks?page=${page}&limit=${limit}`);
  },

  /** 최근 24시간 위험 게시물 (관리자 최신 정보용) */
  getRecent() {
    return request('GET', '/api/risks/recent');
  },

  getStats(days = 7) {
    return request('GET', `/api/risks/stats?days=${days}`);
  },

  checkContent(content) {
    return request('POST', '/api/risks/check', { body: { content } });
  },
};

// ========== 민감 키워드 (Keywords) ==========
export const keywordsApi = {
  getList() {
    return request('GET', '/api/keywords');
  },

  add(body) {
    return request('POST', '/api/keywords', { body });
  },

  toggle(id, isActive) {
    return request('PATCH', `/api/keywords/${id}/toggle`, { body: { is_active: isActive } });
  },
};

// ========== 활동 내역 (Activities) ==========
export const activitiesApi = {
  getList(params = {}) {
    const { page = 1, limit = 50 } = params;
    return request('GET', `/api/activities?page=${page}&limit=${limit}`);
  },

  getRecent() {
    return request('GET', '/api/activities/recent');
  },

  getStats(days = 7) {
    return request('GET', `/api/activities/stats?days=${days}`);
  },
};

// ========== 리뷰 (Reviews) ==========
export const reviewsApi = {
  getList(params = {}) {
    const { page = 1, limit = 10, cnsl_id, member_id } = params;
    const q = new URLSearchParams({ page, limit });
    if (cnsl_id != null) q.set('cnsl_id', cnsl_id);
    if (member_id != null) q.set('member_id', member_id);
    return request('GET', `/api/reviews?${q}`);
  },

  getById(id) {
    return request('GET', `/api/reviews/${id}`);
  },

  create(body, userId) {
    return request('POST', '/api/reviews', { body, userId });
  },

  update(id, body, userId) {
    return request('PUT', `/api/reviews/${id}`, { body, userId });
  },

  delete(id, userId) {
    return request('DELETE', `/api/reviews/${id}`, { userId });
  },

  getAverageByCounsel(cnslId) {
    return request('GET', `/api/reviews/counsel/${cnslId}/average`);
  },
};

// ========== 상담사 상담 내역 (Cnsl) ==========
// cnslerId: 백엔드 member 테이블의 member_id (이메일 사용). Supabase 로그인 시 user.email 전달 권장.
// status: B=상담 예정, C=상담 진행중, D=상담 완료 (미전달 시 전체)
// page: 0-based (Spring 기본). 빈 목록 시 백엔드 204 처리.
export const cnslApi = {
  /** 상담사별 상담 목록 (상태 필터, 페이징) */
  async getListByCounselor(cnslerId, params = {}, userId) {
    const { status, page = 0, size = 10 } = params;
    const q = new URLSearchParams({ page, size });
    if (status) q.set('status', status);
    const res = await axiosInstance.get(`/api/cnslList/${encodeURIComponent(cnslerId)}?${q}`, {
      headers: getHeaders(userId),
    });
    if (res.status === 204) return { content: [], totalElements: 0, totalPages: 0, number: page, size };
    return res.data;
  },

  /** 상담사별 상담 예약 목록 (수락 전 A 상태, 페이징) */
  async getRsvListByCounselor(cnslerId, params = {}, userId) {
    const { page = 0, size = 10 } = params;
    const q = new URLSearchParams({ page, size });
    const res = await axiosInstance.get(`/api/cnslRsvList/${encodeURIComponent(cnslerId)}?${q}`, {
      headers: getHeaders(userId),
    });
    if (res.status === 204) return { content: [], totalElements: 0, totalPages: 0, number: page, size };
    return res.data;
  },
};

// ========== 상담센터 위치 (Centers) ==========
export const centersApi = {
  /** 목록 (검색, 페이징, 위도/경도·반경km 선택) - radiusKm 있으면 해당 반경 이내만 */
  getList(params = {}) {
    const { query = '', page = 1, pageSize = 7, lat, lng, radiusKm } = params;
    const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (query) q.set('query', query);
    if (lat != null) q.set('lat', String(lat));
    if (lng != null) q.set('lng', String(lng));
    if (radiusKm != null && radiusKm > 0) q.set('radiusKm', String(radiusKm));
    return request('GET', `/api/centers?${q}`);
  },

  /** 상세 */
  getById(id) {
    return request('GET', `/api/centers/${id}`);
  },

  /** 카카오 로컬 API - 반경(km) 내 상담센터/복지센터 등 검색 */
  getKakaoNearby(params = {}) {
    const { lat, lng, radiusKm = 5 } = params;
    const q = new URLSearchParams({ lat: String(lat), lng: String(lng), radiusKm: String(radiusKm) });
    return request('GET', `/api/centers/kakao-nearby?${q}`);
  },
};

// ========== 회원 동기화 (Supabase Auth → Spring member 테이블) ==========
export const memberApi = {
  /** 로그인한 사용자를 백엔드 member 테이블에 등록. 게시글 작성 등에 필요. */
  sync(body) {
    return request('POST', '/api/member/sync', { body });
  },
};

export { BACKEND_BASE, getHeaders };
