# Axios API 연동 메뉴얼

프론트엔드에서 Spring 백엔드 API를 **axios**로 호출하도록 적용한 방식과 동작을 설명합니다.

---

## 1. 적용 내용 요약

| 항목 | 내용 |
|------|------|
| **변경 전** | `fetch`로 직접 백엔드 URL 호출 |
| **변경 후** | **axios 인스턴스** 하나를 두고, 모든 API가 이 인스턴스를 통해 호출 |
| **효과** | baseURL·타임아웃·헤더·에러 처리를 한 곳에서 관리 |

---

## 2. 파일 구조

```
frontend/
├── .env                    # VITE_BACKEND_URL (백엔드 주소)
├── src/
│   └── api/
│       ├── axiosInstance.js   # axios 인스턴스 + 공통 설정 (신규)
│       └── backendApi.js      # API 메서드 모음 (axios 사용으로 수정)
```

- **axiosInstance.js**: 백엔드용 axios 한 개만 생성하고, baseURL·타임아웃·인터셉터 설정
- **backendApi.js**: 게시판, 리뷰, 위험 게시물, 키워드, 활동 내역, 상담, 회원 등 **실제 API 메서드** 정의. 내부에서 `axiosInstance` 사용

---

## 3. 동작 방식

### 3.1 전체 흐름

```
[페이지/컴포넌트]
       │
       │  import { bbsApi } from '@/api/backendApi'
       │  bbsApi.getList({ page: 1 })
       ▼
[backendApi.js]
       │  request('GET', '/api/bbs?page=1&...')
       │  → axiosInstance.request({ method, url, headers, data })
       ▼
[axiosInstance.js]
       │  baseURL + url → 최종 URL (예: http://localhost:8080/api/bbs?...)
       │  headers: getHeaders(userId) → X-User-Id, Content-Type
       │  timeout: 15000
       ▼
[Spring 백엔드]
       │  응답 (200 OK / 4xx, 5xx)
       ▼
[axiosInstance.js]
       │  인터셉터: 4xx/5xx → Error(메시지) throw
       │  2xx → response 그대로 반환
       ▼
[backendApi.js]
       │  res.data 반환
       ▼
[페이지/컴포넌트]
       │  데이터 사용 또는 catch로 에러 처리
```

### 3.2 axiosInstance.js 역할

1. **baseURL**  
   - `import.meta.env.VITE_BACKEND_URL` 사용  
   - 없으면 `http://localhost:8080` 사용  

2. **공통 설정**  
   - `timeout: 15000` (15초)  
   - 기본 헤더 `Content-Type: application/json`  

3. **getHeaders(userId)**  
   - 로그인 사용자: `userId`를 `X-User-Id`에 설정  
   - 비로그인: `localStorage`의 `dummyUser` 또는 `'anonymous'`  

4. **응답 인터셉터**  
   - 4xx/5xx 시 `response.data`의 `error`/`message`로 `Error` 생성 후 throw  
   - 콘솔에 `[API Error]` 로그 출력  

### 3.3 backendApi.js 역할

- **request(method, path, options)**  
  - `axiosInstance.request()` 호출  
  - `options`: `{ body, userId }`  
  - 성공 시 `response.data`만 반환  

- **API별 객체**  
  - `bbsApi`, `risksApi`, `keywordsApi`, `activitiesApi`, `reviewsApi`, `cnslApi`, `centersApi`, `memberApi`  
  - 각 메서드가 내부적으로 `request()` 또는 `axiosInstance`를 사용  

---

## 4. 설정 방법

### 4.1 백엔드 주소 (.env)

프로젝트 루트의 `frontend/.env`:

```env
# Spring 백엔드 주소. 없으면 http://localhost:8080 사용
VITE_BACKEND_URL=http://localhost:8080
```

- 다른 서버 사용 예: `VITE_BACKEND_URL=https://api.example.com`
- **주의**: `VITE_` 접두사가 있는 변수만 프론트에서 접근 가능합니다.
- 수정 후 **개발 서버 재시작** 필요 (`npm run dev` 다시 실행).

### 4.2 백엔드 CORS

Spring에서 프론트 도메인을 허용해야 합니다.  
예: `http://localhost:5173` (Vite 기본), 배포 시 실제 프론트 URL.

---

## 5. 페이지/컴포넌트에서 사용법

### 5.1 API 불러오기

```javascript
import { bbsApi, risksApi, memberApi } from '../../api/backendApi';
// 또는
import { cnslApi } from '../../../api/backendApi';
```

### 5.2 호출 예시 (게시판 목록)

```javascript
// GET - 파라미터만
const data = await bbsApi.getList({ page: 1, limit: 10, bbs_div: 'FREE' });

// GET - 상세
const post = await bbsApi.getById(postId);

// POST - body + 로그인 사용자
await bbsApi.create({ title, content, bbs_div: 'FREE', ... }, user?.id);

// DELETE - 로그인 사용자
await bbsApi.delete(postId, user?.id);
```

### 5.3 에러 처리

모든 API는 실패 시 **Error**를 throw합니다.

```javascript
try {
  const list = await bbsApi.getList({ page: 1 });
  setPosts(list.content);
} catch (err) {
  console.error(err.message);  // 백엔드에서 넘긴 메시지 또는 'HTTP 404' 등
  setError(err.message);
}
```

---

## 6. 새 API 엔드포인트 추가 방법

### 6.1 backendApi.js에 메서드 추가

1. 해당 도메인 객체 찾기 (예: `bbsApi`, `risksApi`).
2. 새 메서드에서 `request()` 호출.

```javascript
// GET 예시
getNewList(params = {}) {
  const q = new URLSearchParams(params);
  return request('GET', `/api/new-resource?${q}`);
}

// POST 예시
createNew(body, userId) {
  return request('POST', '/api/new-resource', { body, userId });
}
```

### 6.2 새 API 모듈이 필요할 때

1. `backendApi.js`에 새 객체 추가.
2. `request()`를 사용해 엔드포인트 호출.
3. 필요하면 `export`에 추가.

```javascript
export const newApi = {
  getList() {
    return request('GET', '/api/new');
  },
};
```

페이지에서는 `import { newApi } from '@/api/backendApi'` 후 `newApi.getList()`처럼 사용하면 됩니다.

---

## 7. 에러 처리 동작

- **네트워크 오류 / 타임아웃**: axios가 throw하는 에러가 그대로 전달됩니다.
- **4xx/5xx**: 인터셉터에서 `Error(메시지)`로 바꿔 throw합니다.  
  - 메시지 우선순위: `response.data.error` → `response.data.message` → `error.message` → `HTTP {status}`.
- **콘솔**: 4xx/5xx일 때 `[API Error]`, status, url, data가 출력됩니다.

---

## 8. 트러블슈팅

| 현상 | 확인 사항 |
|------|-----------|
| 요청이 안 나감 / 404 | `.env`의 `VITE_BACKEND_URL`이 맞는지, 백엔드 서버가 떠 있는지 확인. |
| CORS 에러 | Spring에서 프론트 출처(예: `http://localhost:5173`) CORS 허용. |
| 401/403 | `X-User-Id` 또는 백엔드 인증 방식 확인. 필요 시 `getHeaders(userId)`에 토큰 등 추가. |
| 타임아웃 | `axiosInstance.js`의 `timeout` 값 조정 (현재 15000 ms). |

---

## 9. 참고: 제공 API 목록 (backendApi.js)

- **bbsApi**: 게시판 목록/상세/작성/수정/삭제, 인기글, 댓글, 좋아요
- **risksApi**: 위험 게시물 목록, 최근, 통계, 내용 검사
- **keywordsApi**: 키워드 목록, 추가, 토글
- **activitiesApi**: 활동 목록, 최근, 통계
- **reviewsApi**: 리뷰 목록/상세/작성/수정/삭제, 상담별 평균
- **cnslApi**: 상담사별 상담 목록, 예약 목록
- **centersApi**: 상담센터 목록/상세, 카카오 근처 검색
- **memberApi**: 회원 동기화 (Supabase → Spring)

모두 **axios 인스턴스**를 통해 동일한 baseURL·헤더·타임아웃·에러 처리로 동작합니다.
