import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  const isLogin = req.url.includes('/auth/login');

  if (token && !isLogin) {
    return next(
      req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      })
    );
  }

  return next(req);
};
