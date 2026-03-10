import { authApi } from '../axios/Auth';

export const getMyBbsList = async (token, keyword = '', page = 0, size = 20) => {
  const { data } = await authApi.get('/api/mypage/bbslist', {
    params: {
      keyword,
      page,
      size,
      sort: 'created_at,desc',
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};
